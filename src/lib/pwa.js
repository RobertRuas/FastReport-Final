import { app } from './state.svelte.js';

// Modo offline: só existe em HTTPS (ou localhost).
let waiting = null, wantReload = false;
export function applyUpdate() {
  wantReload = true;
  if (waiting && waiting.state !== 'activated') waiting.postMessage('skipWaiting');
  else location.reload();
}
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      const track = (w) => {
        if (!w) return;
        w.addEventListener('statechange', () => {
          if ((w.state === 'installed' || w.state === 'activated') && navigator.serviceWorker.controller) { waiting = w; app.updateReady = true; }
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) { waiting = reg.waiting; app.updateReady = true; }
      track(reg.installing);
      reg.addEventListener('updatefound', () => track(reg.installing));
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (wantReload && !reloaded) { reloaded = true; location.reload(); }
      });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    } catch (e) {
      console.warn('sw', e);
    }
  });
}

export const offlineCapable = () => 'serviceWorker' in navigator && window.isSecureContext;
