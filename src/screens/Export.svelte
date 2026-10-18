<script>
  import { app, current, stats, exportPlan, buildZip, setZipLayout, markExported, formatBytes, formatTime, confirmAlert, deleteProject, toast } from '../lib/state.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import Sheet from '../components/Sheet.svelte';
  import NavButton from '../components/NavButton.svelte';
  import Icon from '../components/Icon.svelte';

  const p = $derived(current());
  const s = $derived(stats(p));
  const folders = $derived(exportPlan(p).filter((x) => x.photos.length));
  const count = $derived(folders.reduce((a, f) => a + f.photos.length, 0));
  let phase = $state(current()?.exportedAt ? 'done' : 'ready'); // ready | building | built | done
  let progress = $state(0);
  let zip = $state(null);
  const close = () => (app.sheet = null);
  const flat = $derived(app.zipLayout === 'flat');
  const zipName = $derived(`${p.slug}${flat ? '_fotos' : ''}.zip`);

  function pick(v) {
    if (v === app.zipLayout) return;
    setZipLayout(v);
    if (phase === 'built') { zip = null; phase = 'ready'; }
  }

  async function build() {
    phase = 'building';
    progress = 0;
    try {
      zip = await buildZip(p, (v) => (progress = v), app.zipLayout);
      phase = 'built';
    } catch (e) {
      console.error(e);
      phase = 'ready';
      toast(t('export.failed'));
    }
  }

  async function deliver() {
    if (!zip) return;
    if (navigator.canShare?.({ files: [zip] })) {
      try {
        await navigator.share({ files: [zip], title: zip.name });
        markExported(p);
        phase = 'done';
      } catch (e) {
        if (e?.name !== 'AbortError') download();
      }
      return;
    }
    download();
  }

  function download() {
    const url = URL.createObjectURL(zip);
    const a = document.createElement('a');
    a.href = url;
    a.download = zip.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    markExported(p);
    phase = 'done';
    toast(t('export.downloaded'));
  }

  function remove() {
    confirmAlert(t('export.delete.title'), t('export.delete.body', { n: s.total }), t('app.delete'), () => {
      const id = p.id;
      app.sheet = null;
      app.projectId = null;
      setTimeout(() => deleteProject(id), 450);
      toast(t('project.deleted'));
    });
  }
</script>

<Sheet onclose={close}>
  <div class="head">
    <span></span>
    <div class="t">{t('export.title')}</div>
    <NavButton label={t('app.ok')} bold onclick={close} />
  </div>
  <div class="body">
    <div class="zip">
      <div class="zi"><Icon name="box" size={30} stroke={1.8} /></div>
      <div class="zt">
        <div class="zn">{zipName}</div>
        <div class="zs">{flat ? t('export.summaryFlat', { n: count, size: formatBytes(s.bytes) }) : t('export.summary', { f: folders.length, n: count, size: formatBytes(s.bytes) })}</div>
      </div>
    </div>

    {#if phase !== 'building'}
      <div class="seg" role="radiogroup" aria-label={t('export.layout')}>
        <button class:on={!flat} role="radio" aria-checked={!flat} onclick={() => pick('folders')}><Icon name="review" size={16} /> {t('export.layout.folders')}</button>
        <button class:on={flat} role="radio" aria-checked={flat} onclick={() => pick('flat')}><Icon name="photos" size={16} /> {t('export.layout.flat')}</button>
      </div>
      <div class="note seg-note">{t(flat ? 'export.layout.flatHint' : 'export.layout.foldersHint')}</div>
    {/if}

    {#if s.pending && !flat}
      <div class="warn">⚠︎ {t('export.pendingWarn', { n: s.pending })}</div>
    {/if}

    {#if phase === 'ready'}
      <button class="btn full" onclick={build} disabled={!count}><Icon name="box" size={20} /> {t('export.build')}</button>
      <div class="note">{t(flat ? 'export.helpFlat' : 'export.help')}</div>
    {:else if phase === 'building'}
      <div class="prog"><span style:width="{progress * 100}%"></span></div>
      <div class="note center">{t('export.building', { p: Math.round(progress * 100) })}</div>
    {:else if phase === 'built'}
      <div class="ready">{t('export.ready', { size: formatBytes(zip.size) })}</div>
      <button class="btn full pulse" onclick={deliver}><Icon name="share" size={20} /> {t('export.share')}</button>
      <div class="note">{t(flat ? 'export.helpFlat' : 'export.help')}</div>
    {:else}
      <div class="ok"><Icon name="check" size={22} stroke={3} /> {t('export.done', { time: formatTime(p.exportedAt) })}</div>
      <button class="btn secondary full" onclick={build}>{t('export.again')}</button>
      <button class="btn danger full" onclick={remove}><Icon name="trash" size={20} /> {t('export.deleteFromPhone')}</button>
      <div class="note">{t('export.deleteHint')}</div>
    {/if}

    <div class="section-title">{t('export.contents')}</div>
    <div class="group">
      {#if flat}
        <div class="row"><span class="grow mono">{p.name}/</span><span class="value">{count}</span></div>
      {:else}
        {#each folders as f}
          <div class="row"><span class="grow mono">{f.slot.group ? `${f.slot.group}/` : ''}{f.slot.folder}/</span><span class="value">{f.photos.length}</span></div>
        {/each}
        <div class="row"><span class="grow mono">fastreport.json</span><span class="value">{t('export.metadata')}</span></div>
      {/if}
    </div>
  </div>
</Sheet>

<style>
  .head { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 8px; }
  .head :global(.nb) { justify-self: end; }
  .t { font-weight: 600; }
  .body { overflow-y: auto; padding: 8px 0 28px; }
  .zip { display: flex; gap: 14px; align-items: center; margin: 4px 16px 14px; padding: 14px; background: var(--bg2); border-radius: 16px; }
  .zi { width: 54px; height: 54px; flex: none; border-radius: 12px; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; }
  .zt { min-width: 0; }
  .zn { font-weight: 600; word-break: break-all; }
  .zs { font-size: 13px; color: var(--label2); margin-top: 2px; }
  .seg { display: grid; grid-template-columns: 1fr 1fr; margin: 0 16px 6px; background: var(--fill); border-radius: 9px; padding: 2px; }
  .seg button { height: 32px; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 7px; font-size: 13px; font-weight: 600; white-space: nowrap; transition: background 0.25s var(--ease), box-shadow 0.25s; }
  .seg button.on { background: var(--bg2); box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
  .seg-note { margin-bottom: 14px; }
  .warn { margin: 0 16px 12px; font-size: 13px; color: var(--orange); }
  .full { display: flex; width: calc(100% - 32px); margin: 0 16px 10px; }
  .note { font-size: 13px; color: var(--label2); padding: 0 20px; line-height: 1.4; }
  .center { text-align: center; }
  .prog { height: 8px; border-radius: 4px; background: var(--fill); margin: 14px 16px 10px; overflow: hidden; }
  .prog span { display: block; height: 100%; background: var(--accent); transition: width 0.1s linear; }
  .ready { text-align: center; font-size: 13px; color: var(--label2); margin-bottom: 8px; }
  .pulse { animation: pulse 1.6s ease-in-out 2; }
  @keyframes pulse { 50% { transform: scale(1.025); } }
  .ok { display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--green); font-weight: 600; margin: 4px 0 14px; }
  .mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 14px; }
</style>
