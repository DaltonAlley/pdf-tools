use std::{
    net::{IpAddr, Ipv4Addr, SocketAddr},
    path::{Path, PathBuf},
    sync::Arc,
};

use pdf_tools_server::{
    app_with_frontend_dist, bounded_setting, read_env_u16, read_optional_env_usize, AppError,
    AppResult, AppState, FrontendDist, MAX_CONFIGURED_MEGABYTES,
};
use tokio::net::TcpListener;
use tracing::{error, info};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> AppResult<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let frontend_dist = configured_frontend_dist(
        std::env::var_os("PDF_TOOLS_FRONTEND_DIR").map(PathBuf::from),
        &std::env::current_dir()?,
    )?;
    let state = Arc::new(AppState::from_env()?);
    let max_upload_mb = read_optional_env_usize("MAX_UPLOAD_MB")?
        .map(|value| bounded_setting("MAX_UPLOAD_MB", value, 1, MAX_CONFIGURED_MEGABYTES))
        .transpose()?;
    let router = app_with_frontend_dist(state, max_upload_mb, frontend_dist)?;
    let port = read_env_u16("PORT", 3000)?;
    if port == 0 {
        return Err(AppError::Internal(
            "environment variable PORT must be between 1 and 65535".to_string(),
        ));
    }

    let addr = SocketAddr::new(read_bind_address()?, port);
    let listener = TcpListener::bind(addr).await?;
    info!(%addr, "PDF Tools server listening");
    axum::serve(listener, router)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

fn configured_frontend_dist(
    directory: Option<PathBuf>,
    working_directory: &Path,
) -> AppResult<FrontendDist> {
    // Cargo can reuse binaries after a checkout moves. Resolve assets at
    // runtime instead of relying on the compiled CARGO_MANIFEST_DIR.
    FrontendDist::validate(directory.unwrap_or_else(|| working_directory.join("frontend/dist")))
}

fn read_bind_address() -> AppResult<IpAddr> {
    match std::env::var("PDF_TOOLS_BIND_ADDRESS") {
        Ok(value) => configured_bind_address(Some(&value)).map_err(AppError::Internal),
        Err(std::env::VarError::NotPresent) => {
            configured_bind_address(None).map_err(AppError::Internal)
        }
        Err(std::env::VarError::NotUnicode(_)) => Err(AppError::Internal(
            "environment variable PDF_TOOLS_BIND_ADDRESS is not valid Unicode".to_string(),
        )),
    }
}

fn configured_bind_address(value: Option<&str>) -> Result<IpAddr, String> {
    let Some(value) = value else {
        return Ok(IpAddr::V4(Ipv4Addr::LOCALHOST));
    };
    value.trim().parse::<IpAddr>().map_err(|_| {
        format!(
            "environment variable PDF_TOOLS_BIND_ADDRESS must be an IP address, such as 127.0.0.1 or 0.0.0.0; got `{value}`"
        )
    })
}

async fn shutdown_signal() {
    let ctrl_c = async {
        if let Err(err) = tokio::signal::ctrl_c().await {
            error!(%err, "could not install Ctrl-C handler");
            std::future::pending::<()>().await;
        }
    };

    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut signal) => {
                signal.recv().await;
            }
            Err(err) => {
                error!(%err, "could not install SIGTERM handler");
                std::future::pending::<()>().await;
            }
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
    info!("shutdown signal received");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::Ipv6Addr;

    #[test]
    fn frontend_follows_moved_checkout_and_honors_explicit_directory() {
        let root = std::env::temp_dir().join(format!(
            "pdf-tools-frontend-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let original = root.join("original checkout");
        let moved = root.join("moved checkout");
        std::fs::create_dir_all(original.join("frontend/dist")).unwrap();
        std::fs::write(original.join("frontend/dist/app.html"), "frontend").unwrap();
        std::fs::rename(&original, &moved).unwrap();
        let expected = FrontendDist::validate(moved.join("frontend/dist")).unwrap();
        assert_eq!(configured_frontend_dist(None, &moved).unwrap(), expected);
        assert_eq!(
            configured_frontend_dist(Some(moved.join("frontend/dist")), &original).unwrap(),
            expected
        );
        let error = configured_frontend_dist(None, &original).unwrap_err();
        assert!(error
            .to_string()
            .contains("frontend distribution directory does not exist"));
        assert!(error.to_string().contains("original checkout"));
        std::fs::remove_file(moved.join("frontend/dist/app.html")).unwrap();
        assert!(configured_frontend_dist(None, &moved).is_err());
        assert!(configured_frontend_dist(Some(PathBuf::from("frontend/dist")), &moved).is_err());
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn bind_address_defaults_to_loopback_and_accepts_ip_literals() {
        assert_eq!(
            configured_bind_address(None),
            Ok(IpAddr::V4(Ipv4Addr::LOCALHOST))
        );
        assert_eq!(
            configured_bind_address(Some("127.0.0.1")),
            Ok(IpAddr::V4(Ipv4Addr::LOCALHOST))
        );
        assert_eq!(
            configured_bind_address(Some(" ::1 ")),
            Ok(IpAddr::V6(Ipv6Addr::LOCALHOST))
        );
    }

    #[test]
    fn bind_address_rejects_hostnames_with_actionable_guidance() {
        let error =
            configured_bind_address(Some("localhost")).expect_err("hostname must be rejected");
        assert!(error.contains("PDF_TOOLS_BIND_ADDRESS must be an IP address"));
        assert!(error.contains("localhost"));
    }
}
