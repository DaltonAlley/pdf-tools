# Elm frontend

Initialize dependencies with `git submodule update --init --recursive` and enter
`nix develop .#pdf-app` from the repository root. In this directory,
`npm ci && npm run build` compiles Elm and the OCaml bootstrap with optimization,
hashes the complete Elm/bootstrap/bridge/DA-adapter/CSS bundle, writes `dist/app.html`, and
generates gzip sidecars. The development shell supplies OCaml, Dune, and
`js_of_ocaml`; the Docker build supplies them through opam.
Axum serves everything from that distribution; API URLs are relative. Elm's file
picker, multipart uploads, JSON HTTP calls and polling are native Elm packages.
The interface works on insecure HTTP origins. JavaScript uses no secure-context
APIs and selected file IDs are monotonically assigned by Elm.

## Rust API generation

Run `scripts/generate-elm.sh` from the repository root after installing npm
packages. `--check` regenerates into a temporary file and compares both generated
codecs and Rust serialization fixtures. CI runs this drift check and Elm contract
tests against actual production Rust serialization, including all unit enum
variants, layout output, presets, overrides, and duplex metadata.

The optional `elm-codegen` Rust feature pins elm-rs 0.2.3. `build.rs` adds its
three derives to a generation-only copy of the actual imposition declarations
and the prepared-source/preview-batch handler structs. Production Serde and
processing remain unchanged. elm-rs cannot parse Serde's function-valued
`default` attribute; the mirror changes that attribute to plain `default`.
Current encoders send every field explicitly. Persisted old data is normalized
by Rust on catalog GET, so Elm does not implement a second persistence schema.

Elm constructors share a global namespace. The generator prefixes each enum's
constructors with its Rust type name while preserving every Serde wire string.
`backAlignment` is output-only duplex metadata (`skip_deserializing` in Rust):
the decoder accepts it and the encoder deliberately omits it. Contract tests
compare canonical JSON with this documented output-only exception. Text job IDs
and status lines stay text, and `PDFPV001` preview batches stay binary.

## Ownership and recovery

Elm maintains transactional selected/pending files, source-derived finished-size
defaults and user overrides, separate simplex/duplex quantity drafts, and layout
revision identities.
Inspection, prepared jobs, layouts, previews, and downloads reject obsolete
responses after cancellation or replacement. Failed replacement leaves committed
files and settings available. Applying a preset preserves artwork and quantity
drafts while restoring its printing and geometry choices.

Rust supplies all production placements, page plans, crop travel, bleed and
preview-box geometry. Elm renders those plans in SVG. The old preview snapshot
stays displayed until its replacement completes. Invalid inputs retain their
exact drafts and block export; they never overwrite valid numeric values.

The commit-pinned `browser/elm-browser` submodule is the same OCaml library used
by Squire. `browser/bootstrap.ml` calls `Elm_browser.start` to mount Elm and attach
its versioned bridge. The HTML loader waits for styles, Elm, and the compiled
bootstrap, then supplies the PDF resource adapter through `on_ready`. Startup
errors still show Retry, including a missing Elm module or missing bridge ports.
Rust/Axum remains the HTTP server; the OCaml code runs in the browser.

`browserRequest` and `browserResponse` connect Elm to shared browser features.
Only Storage is enabled. Theme writes retain the existing raw `pdf-tools-theme`
value, and storage failures leave the selected theme active for the current tab.
The pinned Elm companion decodes versioned responses. Update the submodule pin
deliberately; do not copy or edit its implementation in this application.
Clones and CI runners need network access to the submodule's Forgejo host.

`bridge.js` owns PDF-specific browser resources through two documented ports:

- `resources`: Elm commands for preview/cancel/commit/clear, download and epoch
  identity, theme appearance, native dialog focus, file-row focus, and source lease
  ownership on page exit.
- `browserEvents`: preview URL results/errors with tokens, download results with
  epoch tokens, pointer crop coordinates, theme changes, and visibility events.

A single preview scheduler sends at most four pages per request, serially.
Transient failures retry at most three times. The cache is bounded to 32 assets
and 128 MiB, excludes displayed URLs from eviction, and keys assets by source,
page and manual bleed. Committing a new source revokes obsolete-source URLs;
clearing or leaving revokes all previews. Download URLs are revoked after 60
seconds. Replaced sources and completed jobs are deleted, and the active source
lease is renewed every ten minutes and when the page becomes visible. Page exit
releases the source with a keepalive request; server expiry remains the fallback.

The bridge also adapts native `FileList` drop events into an array of original
File objects for Elm's decoder. It contains no PDF processing or layout solver.

## Verification

`npm test` covers validation, state transitions and wire contracts. Python
Playwright scripts under `scripts/` exercise the real backend in Chromium and
Firefox, inspecting output PDFs/images with PyMuPDF/Pillow. They also test
controlled failure recovery, insecure HTTP, preview batches, keyboard focus and
representative responsive breakpoints. `scripts/check.sh` runs the complete
release acceptance with disposable persistent data.

The npm lockfile overrides elm-test's transitive Chokidar with 4.0.3 to remove
the vulnerable legacy watcher dependency. elm-test watches explicit directories
with globbing disabled; both an initial run and a file-change rerun were verified.

## Shared DA components

Common buttons, fields, theme controls, and dialogs come from the pinned
`da-components` 0.2.3 source archive. Both apps consume the same bundle. Domain
state and workflow layout stay in Elm; shared styles own the controls' appearance.
Legacy layout CSS lives in the lower `app` cascade layer. The DA browser adapter
owns dialog focus and dismissal, alongside the app's elm-browser bootstrap.

`npm ci` installs `vendor/da-components-0.2.3.tgz`. The build includes its Elm
sources, combines its stylesheet with app layout CSS, and versions/gzips its
browser adapter with the other assets. No sibling checkout is needed.
