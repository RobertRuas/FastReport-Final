<script>
  // Grelha cujo número de colunas muda com o gesto de pinça (como na app Fotos).
  import { app, colsNow, setCols } from '../lib/state.svelte.js';
  let { children, cls = '' } = $props();
  let startDist = 0, startCols = 0;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  function ts(e) {
    if (e.touches.length === 2) { startDist = dist(e.touches); startCols = colsNow(); }
  }
  function tm(e) {
    if (e.touches.length !== 2 || !startDist) return;
    e.preventDefault();
    const ratio = dist(e.touches) / startDist;
    const next = Math.max(3, Math.min(8, Math.round(startCols / ratio)));
    if (next !== colsNow()) setCols(next);
  }
  function te(e) { if (e.touches.length < 2) startDist = 0; }
  let el;
  $effect(() => {
    // touchmove não pode ser passivo para conseguir bloquear o zoom da página.
    el.addEventListener('touchstart', ts, { passive: true });
    el.addEventListener('touchmove', tm, { passive: false });
    el.addEventListener('touchend', te);
    return () => {
      el.removeEventListener('touchstart', ts);
      el.removeEventListener('touchmove', tm);
      el.removeEventListener('touchend', te);
    };
  });
</script>

<div class="pinch {cls}" bind:this={el} style:--cols={colsNow()} role="presentation">
  {@render children()}
</div>

<style>
  .pinch { touch-action: pan-y; }
</style>
