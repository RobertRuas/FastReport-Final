<script>
  import { app, boot, importZip } from './lib/state.svelte.js';
  import { t } from './lib/i18n.svelte.js';
  import { applyUpdate } from './lib/pwa.js';
  import Home from './screens/Home.svelte';
  import Project from './screens/Project.svelte';
  import Settings from './screens/Settings.svelte';
  import NewProject from './screens/NewProject.svelte';
  import Export from './screens/Export.svelte';
  import Triage from './screens/Triage.svelte';
  import Viewer from './screens/Viewer.svelte';
  import PushScreen from './components/PushScreen.svelte';
  import Toast from './components/Toast.svelte';
  import Alert from './components/Alert.svelte';
  import Install from './components/Install.svelte';
  import Busy from './components/Busy.svelte';
  import ActionSheet from './components/ActionSheet.svelte';

  boot();
  const pushed = $derived(!!app.projectId || app.settingsOpen);
  let zipInput;
  async function onZip(e) {
    const f = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!f) return;
    const p = await importZip(f);
    if (p) { app.tab = 'review'; app.projectId = p.id; }
  }
</script>

{#if !app.ready}
  <div class="splash"><img src="./icons/icon-192.png" alt="" /></div>
{:else}
  <div class="base" class:pushed><Home /></div>

  {#if app.settingsOpen}
    <PushScreen onback={() => (app.settingsOpen = false)}><Settings /></PushScreen>
  {/if}
  {#if app.projectId}
    <PushScreen onback={() => (app.projectId = null)} z={11}><Project /></PushScreen>
  {/if}

  {#if app.sheet === 'new'}<NewProject />{/if}
  {#if app.sheet === 'export' && app.projectId}<Export />{/if}
  {#if app.sheet === 'homeMenu'}
    <ActionSheet
      onclose={() => (app.sheet = null)}
      actions={[
        { label: t('home.new'), run: () => (app.sheet = 'new') },
        { label: t('home.importZip'), run: () => zipInput.click() }
      ]}
    />
  {/if}
  {#if app.triage && app.projectId}<Triage />{/if}
  {#if app.viewer && app.projectId}<Viewer />{/if}
  <Install />
  {#if app.updateReady}
    <button class="update" onclick={applyUpdate}>{t('update.available')}</button>
  {/if}
{/if}
<input bind:this={zipInput} type="file" accept=".zip,application/zip" hidden onchange={onZip} />
<Busy />
<Toast />
<Alert />

<style>
  .base { position: absolute; inset: 0; transition: transform 0.52s var(--ease), opacity 0.52s var(--ease); will-change: transform; }
  .base.pushed { transform: translate3d(-30%, 0, 0); opacity: 0.55; }
  .splash { position: absolute; inset: 0; display: grid; place-items: center; background: var(--bg); }
  .splash img { width: 88px; height: 88px; border-radius: 20px; animation: in 0.4s ease-out; }
  @keyframes in { from { transform: scale(0.9); opacity: 0; } }
  .update {
    position: absolute; left: 12px; right: 12px; top: calc(var(--sat) + 6px); z-index: 960;
    padding: 12px 16px; border-radius: 14px;
    background: var(--accent); color: #fff; font-weight: 600; font-size: 15px;
    box-shadow: var(--shadow);
  }
</style>
