import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { registerServiceWorker } from './lib/pwa.js';

// Impede o zoom da página com dois dedos (o zoom é tratado pela própria app).
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

registerServiceWorker();

export default mount(App, { target: document.getElementById('app') });

// Só em desenvolvimento: acesso ao estado para testes manuais na consola.
if (import.meta.env.DEV) {
  Promise.all([import('./lib/state.svelte.js'), import('./lib/folder.js')]).then(([state, fs]) => (window.__fr = { state, fs }));
}
