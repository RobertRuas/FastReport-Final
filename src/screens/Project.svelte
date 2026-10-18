<script>
  import { app, current, stats, photosIn, inboxSlot, importFiles, confirmAlert, deleteProject, toast, mapById, mapName } from '../lib/state.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import NavBar from '../components/NavBar.svelte';
  import NavButton from '../components/NavButton.svelte';
  import Icon from '../components/Icon.svelte';
  import PinchGrid from '../components/PinchGrid.svelte';
  import ActionSheet from '../components/ActionSheet.svelte';
  import Review from './Review.svelte';
  import { fade } from 'svelte/transition';

  const p = $derived(current());
  const s = $derived(p ? stats(p) : null);
  const inbox = $derived(p ? photosIn(p, inboxSlot(p).id) : []);
  let scrolled = $state(false);
  let importMenu = $state(false);
  let libInput = $state(), camInput = $state();

  const tabs = [
    { id: 'inbox', label: 'project.inbox', icon: 'inbox' },
    { id: 'review', label: 'project.review', icon: 'review' }
  ];

  function startTriage(i = 0) {
    if (!inbox.length) return;
    app.triage = { index: i };
  }
  async function onFiles(e) {
    const files = [...(e.currentTarget.files ?? [])];
    e.currentTarget.value = '';
    if (files.length) await importFiles(p, files);
  }
  function askDelete() {
    confirmAlert(
      t('project.delete.title'),
      p.exportedAt ? t('project.delete.exported', { n: s.total }) : t('project.delete.notExported', { n: s.total }),
      t('app.delete'),
      () => { const id = p.id; app.projectId = null; setTimeout(() => deleteProject(id), 420); toast(t('project.deleted')); }
    );
  }
</script>

{#if p}
  <NavBar title={p.name} scrolled={scrolled || app.tab !== 'inbox'}>
    {#snippet left()}<NavButton icon="back" label={t('app.projects')} onclick={() => (app.projectId = null)} />{/snippet}
    {#snippet right()}
      <NavButton icon="share" onclick={() => (app.sheet = 'export')} disabled={!s.total} />
      <NavButton icon="more" onclick={() => (app.sheet = 'menu')} />
    {/snippet}
  </NavBar>

  <div class="content">
    {#key app.tab}
    <div class="tabview" in:fade={{ duration: 220 }}>
    {#if app.tab === 'inbox'}
      <div class="scroll" onscroll={(e) => (scrolled = e.currentTarget.scrollTop > 4)}>
        {#if !s.total}
          <div class="empty">
            <div class="ei"><Icon name="photos" size={52} stroke={1.4} /></div>
            <div class="dt">{t('project.empty.title')}</div>
            <div class="db">{t('project.empty.body')}</div>
            <button class="btn" onclick={() => libInput.click()}><Icon name="photos" size={20} /> {t('project.fromLibrary')}</button>
            <button class="btn secondary" onclick={() => camInput.click()}><Icon name="camera" size={20} /> {t('project.takePhoto')}</button>
          </div>
        {:else}
          <div class="hero">
            <div class="big">{s.pending}</div>
            <div class="lbl">{s.pending === 1 ? t('project.pending1') : t('project.pending')}</div>
            <div class="sub">{t('project.summary', { s: s.sorted, t: s.trashed })} · {mapName(mapById(p.mapId))}</div>
            <div class="actions">
              <button class="btn" disabled={!s.pending} onclick={() => startTriage(0)}>
                <Icon name="skip" size={20} /> {t('project.startTriage')}
              </button>
              <button class="btn secondary" onclick={() => (importMenu = true)}>
                <Icon name="plus" size={20} /> {t('project.import')}
              </button>
            </div>
          </div>

          {#if inbox.length}
            <PinchGrid>
              <div class="grid">
                {#each inbox as ph, i (ph.id)}
                  <button class="thumb" onclick={() => startTriage(i)}><img src={ph.thumb} alt="" loading="lazy" decoding="async" /></button>
                {/each}
              </div>
            </PinchGrid>
            <div class="hint">{t('project.pinchHint')}</div>
          {:else}
            <div class="done">
              <div class="okc"><Icon name="check" size={34} stroke={2.6} /></div>
              <div class="dt">{t('project.allSorted')}</div>
              <div class="db">{t('project.allSorted.body')}</div>
              <div class="row-btns">
                <button class="btn secondary" onclick={() => (app.tab = 'review')}>{t('project.goReview')}</button>
                <button class="btn" onclick={() => (app.sheet = 'export')}><Icon name="share" size={18} /> {t('project.export')}</button>
              </div>
            </div>
          {/if}
        {/if}
        <div style="height: 24px"></div>
      </div>
    {:else}
      <Review project={p} />
    {/if}
    </div>
    {/key}
  </div>

  <nav class="tabbar">
    {#each tabs as tb}
      <button class="tab" class:on={app.tab === tb.id} onclick={() => (app.tab = tb.id)}>
        <span class="ti">
          <Icon name={tb.icon} size={25} stroke={app.tab === tb.id ? 2.3 : 1.8} />
          {#if tb.id === 'inbox' && s.pending}<span class="dot">{s.pending > 999 ? '999+' : s.pending}</span>{/if}
        </span>
        <span class="tl">{t(tb.label)}</span>
      </button>
    {/each}
  </nav>

  {#if importMenu}
    <ActionSheet
      title={t('project.importTitle')}
      onclose={() => (importMenu = false)}
      actions={[
        { label: t('project.fromLibrary'), run: () => libInput.click() },
        { label: t('project.takePhoto'), run: () => camInput.click() }
      ]}
    />
  {/if}
  {#if app.sheet === 'menu'}
    <ActionSheet
      title={p.name}
      onclose={() => (app.sheet = null)}
      actions={[
        { label: t('project.menu.export'), run: () => (app.sheet = 'export') },
        { label: t('project.menu.import'), run: () => (importMenu = true) },
        { label: t('project.menu.delete'), destructive: true, run: askDelete }
      ]}
    />
  {/if}

  <input bind:this={libInput} type="file" accept="image/*" multiple hidden onchange={onFiles} />
  <input bind:this={camInput} type="file" accept="image/*" capture="environment" hidden onchange={onFiles} />
{/if}

<style>
  .content { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .tabview { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .hero { padding: 8px 16px 18px; }
  .big { font-size: 56px; font-weight: 700; line-height: 1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
  .lbl { font-size: 17px; font-weight: 600; margin-top: 2px; }
  .sub { font-size: 13px; color: var(--label2); margin-top: 4px; }
  .actions { display: grid; grid-template-columns: 1.5fr 1fr; gap: 10px; margin-top: 16px; }
  .hint { text-align: center; font-size: 12px; color: var(--label3); padding: 14px 24px 0; }
  .empty { display: grid; gap: 10px; padding: 64px 28px 20px; text-align: center; }
  .ei { color: var(--label3); }
  .done { display: grid; justify-items: center; gap: 6px; padding: 44px 24px; text-align: center; }
  .okc { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); margin-bottom: 6px; }
  .dt { font-size: 20px; font-weight: 700; }
  .db { color: var(--label2); margin-bottom: 12px; }
  .row-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
  .tabbar {
    display: grid; grid-template-columns: repeat(2, 1fr);
    padding-bottom: var(--sab);
    background: var(--bar);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    backdrop-filter: saturate(180%) blur(20px);
    border-top: 0.5px solid var(--sep);
    flex: none; z-index: 20;
  }
  .tab { height: 50px; display: grid; justify-items: center; align-content: center; gap: 2px; color: var(--label3); transition: color 0.15s; }
  .tab.on { color: var(--accent); }
  .ti { position: relative; display: block; height: 26px; }
  .tl { font-size: 10px; font-weight: 500; }
  .dot {
    position: absolute; left: 16px; top: -4px;
    min-width: 18px; height: 18px; padding: 0 5px;
    border-radius: 9px; background: var(--red); color: #fff;
    font-size: 11px; font-weight: 600; line-height: 18px; text-align: center;
  }
</style>
