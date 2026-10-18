<script>
  import { app, boot, importZip, closeProject, openFolderProject, folderSupported, current, undo, toast, stats, photosIn, inboxSlot, setCols, colsNow } from './lib/state.svelte.js';
  import { t } from './lib/i18n.svelte.js';
  import { applyUpdate } from './lib/pwa.js';
  import { isTyping, mod } from './lib/keys.js';
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
  import Shortcuts from './components/Shortcuts.svelte';
  import ReleaseNotes from './components/ReleaseNotes.svelte';
  import Icon from './components/Icon.svelte';

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
  async function openFolder() {
    try {
      await openFolderProject();
    } catch (e) {
      if (e?.name === 'AbortError') return;
      app.alert = { title: t('folder.title'), body: e.message, actions: [{ label: t('app.ok'), style: 'default' }] };
    }
  }

  // Atalhos globais (computador). A triagem e o visualizador tratam as suas próprias teclas.
  function onKey(e) {
    if (isTyping(e) || app.alert || app.busy) return;
    const p = current();
    const k = e.key.toLowerCase();
    if (e.key === '?' || (mod(e) && e.key === '/')) {
      e.preventDefault();
      app.shortcuts = !app.shortcuts;
      return;
    }
    if (app.triage || app.viewer) return;
    if (e.key === 'Escape') {
      if (app.shortcuts) app.shortcuts = false;
      else if (app.notes) app.notes = false;
      else if (app.sheet) app.sheet = null;
      else if (app.settingsOpen) app.settingsOpen = false;
      else if (p && !app.wide) closeProject();
      return;
    }
    if (app.sheet || app.shortcuts || app.notes) return;
    if (mod(e) && k === 'n' && !e.shiftKey) { e.preventDefault(); app.sheet = 'new'; return; }
    if (mod(e) && k === 'o' && folderSupported()) { e.preventDefault(); openFolder(); return; }
    if (mod(e) && k === ',') { e.preventDefault(); app.settingsOpen = true; return; }
    if (!p) return;
    if (mod(e) && e.shiftKey && k === 'w') { e.preventDefault(); closeProject(); return; }
    if (mod(e) && k === 'z') {
      e.preventDefault();
      if (undo(p)) toast(t('app.undone'));
      else toast(t('app.nothingToUndo'));
      return;
    }
    if (mod(e) && k === 'e' && p.photos.length) { e.preventDefault(); app.sheet = 'export'; return; }
    if (mod(e) && ['1', '2', '3'].includes(e.key)) { e.preventDefault(); app.tab = ['inbox', 'review', 'delivery'][+e.key - 1]; return; }
    if (mod(e) && (e.key === '=' || e.key === '+' || e.key === '-')) {
      // Tamanho das miniaturas (como Ver → Miniaturas maiores/menores no Mac).
      e.preventDefault();
      setCols(Math.max(2, Math.min(14, colsNow() + (e.key === '-' ? 1 : -1))));
      return;
    }
    if (!mod(e) && !e.altKey && k === 't' && photosIn(p, inboxSlot(p).id).length) { e.preventDefault(); app.triage = { index: 0 }; return; }
  }
</script>

<svelte:window onkeydown={onKey} />

{#if !app.ready}
  <div class="splash"><img src="./icons/icon-192.png" alt="" /></div>
{:else if app.wide}
  <!-- Ecrã largo (computador): lista de projetos à esquerda, projeto à direita. -->
  <div class="split">
    <aside class="side"><Home /></aside>
    <main class="main">
      {#if app.settingsOpen}
        <div class="screen"><Settings /></div>
      {:else if app.projectId}
        {#key app.projectId}<div class="screen"><Project /></div>{/key}
      {:else}
        <div class="placeholder">
          <img src="./icons/icon-180.png" alt="" />
          <div class="pt">{t('wide.pick')}</div>
          <div class="pb">{t('wide.pickHint')}</div>
          <div class="pa">
            <button class="btn" onclick={() => (app.sheet = 'new')}><Icon name="plus" size={18} /> {t('home.new')}</button>
            {#if folderSupported()}<button class="btn secondary" onclick={openFolder}><Icon name="folder" size={18} /> {t('home.openFolder')}</button>{/if}
          </div>
          <button class="kb tap" onclick={() => (app.shortcuts = true)}><Icon name="keyboard" size={16} /> {t('shortcuts.open')}</button>
        </div>
      {/if}
    </main>
  </div>
{:else}
  <div class="base" class:pushed><Home /></div>

  {#if app.settingsOpen}
    <PushScreen onback={() => (app.settingsOpen = false)}><Settings /></PushScreen>
  {/if}
  {#if app.projectId}
    <PushScreen onback={closeProject} z={11}><Project /></PushScreen>
  {/if}
{/if}

{#if app.ready}
  {#if app.sheet === 'new'}<NewProject />{/if}
  {#if app.sheet === 'export' && app.projectId}<Export />{/if}
  {#if app.sheet === 'homeMenu'}
    <ActionSheet
      onclose={() => (app.sheet = null)}
      actions={[
        { label: t('home.new'), run: () => (app.sheet = 'new') },
        ...(folderSupported() ? [{ label: t('home.openFolder'), run: openFolder }] : []),
        { label: t('home.importZip'), run: () => zipInput.click() }
      ]}
    />
  {/if}
  {#if app.triage && app.projectId}<Triage />{/if}
  {#if app.viewer && app.projectId}<Viewer />{/if}
  {#if app.shortcuts}<Shortcuts />{/if}
  {#if app.notes}<ReleaseNotes />{/if}
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
    margin: 0 auto; max-width: 520px;
    padding: 12px 16px; border-radius: 14px;
    background: var(--accent); color: #fff; font-weight: 600; font-size: 15px;
    box-shadow: var(--shadow);
  }
  .split { position: absolute; inset: 0; display: grid; grid-template-columns: var(--side-w) minmax(0, 1fr); }
  .side { position: relative; border-right: 0.5px solid var(--sep); background: var(--bg); min-width: 0; }
  .main { position: relative; min-width: 0; background: var(--bg); }
  .placeholder { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 8px; text-align: center; padding: 32px; }
  .placeholder img { width: 72px; height: 72px; border-radius: 17px; margin-bottom: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
  .pt { font-size: 22px; font-weight: 700; }
  .pb { color: var(--label2); max-width: 420px; }
  .pa { display: flex; gap: 10px; margin-top: 14px; }
  .pa .btn { height: 42px; font-size: 15px; }
  .kb { display: inline-flex; align-items: center; gap: 6px; margin-top: 18px; color: var(--label2); font-size: 13px; }
</style>
