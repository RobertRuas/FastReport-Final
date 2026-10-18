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
