/**
 * Aviso de versión nueva: al abrir el juego (y cada 10 min) se descarga la página publicada sin
 * caché y se compara su build-id con el de la versión cargada. Así el móvil no se queda
 * con una versión antigua guardada en caché. No hace nada abierto con doble clic (file://).
 */
export function watchForUpdates(onNewVersion: (reload: () => void) => void): void {
  if (location.protocol === 'file:' || typeof fetch === 'undefined') return;
  let notified = false;
  const check = async () => {
    if (notified) return;
    try {
      const url = location.href.split('#')[0].split('?')[0];
      const res = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      // Leer la etiqueta <meta> de verdad (el texto del propio script también contiene «build-id»)
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const remote = doc.querySelector('meta[name="build-id"]')?.getAttribute('content');
      if (remote && remote !== __BUILD_ID__) {
        notified = true;
        onNewVersion(() => { location.replace(`${url}?v=${remote}`); });
      }
    } catch { /* sin conexión: ya avisaremos */ }
  };
  void check();
  setInterval(check, 10 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void check(); });
}

export const BUILD_ID = __BUILD_ID__;
