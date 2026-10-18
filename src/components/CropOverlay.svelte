<script>
  import { t } from '../lib/i18n.svelte.js';
  let { w, h, oncancel, onapply } = $props();
  let cw = $state(0), ch = $state(0);
  let r = $state({ x: 0.08, y: 0.08, w: 0.84, h: 0.84 });
  // Retângulo onde a imagem aparece (object-fit: contain).
  const box = $derived.by(() => {
    const s = Math.min(cw / w, ch / h);
    const bw = w * s, bh = h * s;
    return { left: (cw - bw) / 2, top: (ch - bh) / 2, w: bw, h: bh };
  });
  let mode = null, start = null, sr = null;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const MIN = 0.12;
  function down(e, m) {
    e.stopPropagation();
    mode = m; start = { x: e.clientX, y: e.clientY }; sr = { ...r };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (!mode) return;
    const ddx = (e.clientX - start.x) / box.w, ddy = (e.clientY - start.y) / box.h;
    let { x, y, w: rw, h: rh } = sr;
    if (mode === 'move') {
      x = clamp(x + ddx, 0, 1 - rw); y = clamp(y + ddy, 0, 1 - rh);
    } else {
      if (mode.includes('l')) { const nx = clamp(x + ddx, 0, x + rw - MIN); rw += x - nx; x = nx; }
      if (mode.includes('r')) rw = clamp(rw + ddx, MIN, 1 - x);
      if (mode.includes('t')) { const ny = clamp(y + ddy, 0, y + rh - MIN); rh += y - ny; y = ny; }
      if (mode.includes('b')) rh = clamp(rh + ddy, MIN, 1 - y);
    }
    r = { x, y, w: rw, h: rh };
  }
  function up() { mode = null; }
</script>

<div class="ov" bind:clientWidth={cw} bind:clientHeight={ch} onpointermove={move} onpointerup={up} role="presentation">
  <div
    class="crop"
    style:left="{box.left + r.x * box.w}px"
    style:top="{box.top + r.y * box.h}px"
    style:width="{r.w * box.w}px"
    style:height="{r.h * box.h}px"
    onpointerdown={(e) => down(e, 'move')}
    role="presentation"
  >
    <i class="g v1"></i><i class="g v2"></i><i class="g h1"></i><i class="g h2"></i>
    {#each ['tl', 'tr', 'bl', 'br'] as c}
      <span class="hd {c}" onpointerdown={(e) => down(e, c)} role="presentation"></span>
    {/each}
  </div>
  <div class="bar">
    <button onclick={oncancel}>{t('app.cancel')}</button>
    <span>{t('triage.crop.hint')}</span>
    <button class="ap" onclick={() => onapply(r)}>{t('triage.crop.apply')}</button>
  </div>
</div>

<style>
  .ov { position: absolute; inset: 0; touch-action: none; z-index: 5; }
  .crop {
    position: absolute;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6);
    outline: 1px solid rgba(255, 255, 255, 0.9);
  }
  .g { position: absolute; background: rgba(255, 255, 255, 0.35); }
  .v1, .v2 { top: 0; bottom: 0; width: 0.5px; }
  .h1, .h2 { left: 0; right: 0; height: 0.5px; }
  .v1 { left: 33.33%; } .v2 { left: 66.66%; }
  .h1 { top: 33.33%; } .h2 { top: 66.66%; }
  .hd { position: absolute; width: 44px; height: 44px; }
  .hd::after { content: ''; position: absolute; width: 22px; height: 22px; border: 0 solid #fff; }
  .tl { left: -14px; top: -14px; } .tl::after { left: 11px; top: 11px; border-left-width: 4px; border-top-width: 4px; }
  .tr { right: -14px; top: -14px; } .tr::after { right: 11px; top: 11px; border-right-width: 4px; border-top-width: 4px; }
  .bl { left: -14px; bottom: -14px; } .bl::after { left: 11px; bottom: 11px; border-left-width: 4px; border-bottom-width: 4px; }
  .br { right: -14px; bottom: -14px; } .br::after { right: 11px; bottom: 11px; border-right-width: 4px; border-bottom-width: 4px; }
  .bar {
    position: absolute; left: 0; right: 0; bottom: 0;
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 16px; background: rgba(0, 0, 0, 0.6);
    font-size: 13px; color: rgba(255, 255, 255, 0.6);
  }
  .bar button { color: #fff; font-size: 17px; padding: 6px 4px; }
  .bar .ap { color: var(--yellow); font-weight: 700; }
</style>
