<script>
  import { fade, fly } from 'svelte/transition';
  import { iosEase } from '../lib/ease.js';
  import { t } from '../lib/i18n.svelte.js';
  let { title = '', actions = [], onclose } = $props();
  function pick(a) {
    onclose?.();
    setTimeout(() => a.run?.(), 120);
  }
</script>

<div class="scrim" transition:fade={{ duration: 260 }} onclick={onclose} role="presentation"></div>
<div class="as" transition:fly={{ y: 320, duration: 440, opacity: 1, easing: iosEase }}>
  <div class="box">
    {#if title}<div class="title">{title}</div>{/if}
    {#each actions as a}
      <button class="a" class:destructive={a.destructive} onclick={() => pick(a)}>{a.label}</button>
    {/each}
  </div>
  <button class="box a cancel" onclick={onclose}>{t('app.cancel')}</button>
</div>

<style>
  .scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.4); z-index: 850; }
  .as {
    position: absolute;
    left: 8px; right: 8px;
    margin: 0 auto;
    max-width: 500px;
    bottom: calc(var(--sab) + 8px);
    z-index: 851;
    display: grid;
    gap: 8px;
  }
  .box {
    border-radius: 14px;
    overflow: hidden;
    background: color-mix(in srgb, var(--bg2) 92%, transparent);
    -webkit-backdrop-filter: blur(30px);
    backdrop-filter: blur(30px);
  }
  .title { font-size: 13px; color: var(--label2); text-align: center; padding: 14px 16px; border-bottom: 0.5px solid var(--sep); }
  .a { display: block; width: 100%; height: 57px; font-size: 20px; color: var(--blue); }
  .a:active { background: var(--fill); }
  .box .a + .a { border-top: 0.5px solid var(--sep); }
  .destructive { color: var(--red); }
  .cancel { font-weight: 600; }
</style>
