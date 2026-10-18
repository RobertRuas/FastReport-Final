// Vibração leve no iPhone (iOS 18+): alternar um <input type="checkbox" switch> dá feedback háptico.
let label;
export function haptic() {
  try {
    if (navigator.vibrate) { navigator.vibrate(8); return; }
    if (!label) {
      label = document.createElement('label');
      label.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;overflow:hidden;opacity:0';
      label.setAttribute('aria-hidden', 'true');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      label.appendChild(input);
      document.body.appendChild(label);
    }
    label.click();
  } catch {}
}
