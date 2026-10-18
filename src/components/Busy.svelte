<script>
  import { app, IMPORT_PX } from '../lib/state.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { fade } from 'svelte/transition';
  const pct = $derived(app.busy && app.busy.total ? app.busy.done / app.busy.total : 0);
  const R = 26, C = 2 * Math.PI * R;
</script>

{#if app.busy}
  <div class="busy" transition:fade={{ duration: 150 }}>
    <div class="box">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={R} class="track" />
        <circle cx="32" cy="32" r={R} class="ring" stroke-dasharray={C} stroke-dashoffset={C * (1 - pct)} />
      </svg>
      <div class="tx">
        {#if app.busy.text === 'zip'}
          {t('zip.importing')}
        {:else}
          {t('project.importing', { d: app.busy.done, t: app.busy.total })}
        {/if}
      </div>
      {#if app.busy.text === 'import'}<div class="sm">{t('project.converting', { px: IMPORT_PX })}</div>{/if}
    </div>
  </div>
{/if}

<style>
  .busy { position: absolute; inset: 0; z-index: 940; background: rgba(0, 0, 0, 0.35); display: grid; place-items: center; }
  .box {
    width: 220px; padding: 22px 16px 18px; border-radius: 18px; text-align: center;
    background: color-mix(in srgb, var(--bg2) 92%, transparent);
    -webkit-backdrop-filter: blur(30px); backdrop-filter: blur(30px);
    display: grid; justify-items: center; gap: 8px;
  }
  svg { transform: rotate(-90deg); }
  circle { fill: none; stroke-width: 6; }
  .track { stroke: var(--fill); }
  .ring { stroke: var(--accent); stroke-linecap: round; transition: stroke-dashoffset 0.2s; }
  .tx { font-weight: 600; font-size: 15px; font-variant-numeric: tabular-nums; }
  .sm { font-size: 12px; color: var(--label2); }
</style>
