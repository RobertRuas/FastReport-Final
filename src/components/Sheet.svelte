<script>
  import { fade } from 'svelte/transition';
  import { iosEase } from '../lib/ease.js';
  let { onclose, children, height = 'auto' } = $props();
  let dy = $state(0);
  let startY = null;
  function slide(node) {
    return { duration: 480, easing: iosEase, css: (t) => `transform: translate3d(0,${(1 - t) * 100}%,0)` };
  }
  function down(e) { startY = e.touches[0].clientY; }
  function move(e) { if (startY != null) dy = Math.max(0, e.touches[0].clientY - startY); }
  function up() {
    if (dy > 120) onclose?.();
    dy = 0; startY = null;
  }
</script>

<div class="scrim" transition:fade={{ duration: 300 }} onclick={onclose} role="presentation"></div>
<div class="sheet" style:height style:transform={dy ? `translateY(${dy}px)` : null} class:dragging={dy > 0} transition:slide>
  <div class="grab" ontouchstart={down} ontouchmove={move} ontouchend={up} role="presentation"><span></span></div>
  {@render children()}
</div>

<style>
  .scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.4); z-index: 800; }
  .sheet {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    margin: 0 auto;
    max-width: 640px;
    max-height: calc(100% - var(--sat) - 12px);
    z-index: 801;
    background: var(--bg);
    border-radius: 14px 14px 0 0;
    padding-bottom: var(--sab);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: transform 0.35s var(--ease);
    box-shadow: var(--shadow);
  }
  .sheet.dragging { transition: none; }
  .grab { height: 22px; display: grid; place-items: center; flex: none; }
  .grab span { width: 36px; height: 5px; border-radius: 3px; background: var(--fill2); }
</style>
