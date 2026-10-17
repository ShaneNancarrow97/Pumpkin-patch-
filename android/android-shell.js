/* Native shell only: the browser release remains unchanged. */
(() => {
  // Older Android WebViews predate this ES2022 helper used by save validation.
  if (!Object.hasOwn) Object.defineProperty(Object, 'hasOwn', {
    value: (object, key) => Object.prototype.hasOwnProperty.call(object, key),
    configurable: true, writable: true
  });
  // Android 11's factory WebView also predates replaceChildren (Chrome 86).
  for (const type of [globalThis.Element, globalThis.DocumentFragment, globalThis.Document]) {
    if (type && !type.prototype.replaceChildren) Object.defineProperty(type.prototype, 'replaceChildren', {
      value: function (...nodes) {
        while (this.firstChild) this.removeChild(this.firstChild);
        this.append(...nodes);
      }, configurable: true, writable: true
    });
  }
  // The Activity already owns fullscreen; omit redundant browser fullscreen controls.
  document.documentElement.requestFullscreen = undefined;
  let suspended = false, wasPaused = false;
  window.pumpkinNativeForeground = active => {
    const app = globalThis.PumpkinPatch?.app;
    if (!app) return;
    if (!active && !suspended) {
      wasPaused = app.state.paused;
      suspended = true;
      app.save();
      app.state.paused = true;
    }
    if (active && suspended) {
      app.state.paused = wasPaused;
      suspended = false;
    }
    document.dispatchEvent(new Event('visibilitychange'));
  };
  document.addEventListener('click', async event => {
    const link = event.target.closest?.('a[download]');
    if (!link || !link.href.startsWith('blob:')) return;
    event.preventDefault();
    try {
      const text = await (await fetch(link.href)).text();
      PumpkinAndroid.exportBackup(text, link.download);
    } catch {
      const message = document.getElementById('backup-message');
      if (message) message.textContent = 'Backup could not be opened. Please try again.';
    }
  }, true);
})();
