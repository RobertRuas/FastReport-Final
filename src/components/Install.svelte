<script>
  // Dica para instalar no ecrã principal quando aberta no Safari (o iOS não tem botão automático).
  import Icon from './Icon.svelte';
  import { fly } from 'svelte/transition';
  import { app } from '../lib/state.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  let show = $state(false);
  try { show = ios && !standalone && !sessionStorage.getItem('fr-install-dismissed'); } catch { show = ios && !standalone; }
  function dismiss() {
    show = false;
    try { sessionStorage.setItem('fr-install-dismissed', '1'); } catch {}
  }
</script>

{#if show && !app.projectId && !app.settingsOpen && !app.sheet}
  <div class="tip" transition:fly={{ y: 80, duration: 300 }}>
    <img src="./icons/icon-180.png" alt="" />
    <div class="tx">
      <b>{t('install.title')}</b>
      <span>{t('install.body', { icon: '⎋' }).split('⎋')[0]}<Icon name="share" size={15} />{t('install.body', { icon: '⎋' }).split('⎋')[1]}</span>
    </div>
    <button onclick={dismiss} aria-label="close"><Icon name="close" size={18} /></button>
  </div>
{/if}

<style>
  .tip {
    position: absolute; left: 10px; right: 10px; bottom: calc(var(--sab) + 10px); z-index: 500;
    display: flex; gap: 12px; align-items: center;
    padding: 12px; border-radius: 16px;
    background: color-mix(in srgb, var(--bg2) 92%, transparent);
    -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);
    box-shadow: var(--shadow);
  }
  img { width: 44px; height: 44px; border-radius: 10px; }
  .tx { flex: 1; font-size: 13px; display: grid; gap: 2px; }
  .tx b { font-size: 15px; }
  .tx span { color: var(--label2); }
  .tx :global(svg) { vertical-align: -3px; color: var(--blue); }
  button { color: var(--label3); padding: 6px; }
</style>
