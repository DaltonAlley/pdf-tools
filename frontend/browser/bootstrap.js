/* Mount Elm and persist its theme preference. PDF resources belong to bridge.js. */
(() => {
  function start(connect, ready, failed) {
    let disconnect;
    try {
      const node = document.getElementById('app');
      if (!node) throw new Error('Missing application mount');
      if (typeof globalThis.Elm?.Main?.init !== 'function') throw new Error('Missing Elm.Main');
      const flags = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
      const app = globalThis.Elm.Main.init({node, flags});
      const ports = app?.ports;
      for (const name of ['resources', 'browserRequest']) {
        if (typeof ports?.[name]?.subscribe !== 'function' || typeof ports[name].unsubscribe !== 'function') {
          throw new Error(`Missing ${name} command port`);
        }
      }
      for (const name of ['browserEvents', 'browserResponse']) {
        if (typeof ports?.[name]?.send !== 'function') throw new Error(`Missing ${name} response port`);
      }
      const saveTheme = request => {
        if (typeof request?.id !== 'string') return;
        let response;
        try {
          if (request.version !== 1 || request.action !== 'storage.set' || request.key !== 'theme' || request.session !== false || !['light', 'dark'].includes(request.value)) {
            throw new Error('Unsupported theme storage request');
          }
          // Keep the raw value readable by existing PDF Tools releases.
          globalThis.localStorage.setItem('pdf-tools-theme', request.value);
          response = {version: 1, id: request.id, kind: 'ok', value: request.value};
        } catch (error) {
          response = {version: 1, id: request.id, kind: 'error', message: error?.message || 'Storage unavailable'};
        }
        ports.browserResponse.send(response);
      };
      ports.browserRequest.subscribe(saveTheme);
      disconnect = () => ports.browserRequest.unsubscribe(saveTheme);
      connect(app);
      ready();
      return disconnect;
    } catch (error) {
      disconnect?.();
      failed(error?.message || 'Application failed');
    }
  }
  globalThis.PdfToolsBrowser = Object.freeze({start});
})();
