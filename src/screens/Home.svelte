<script>
  import { app, stats, mapById, mapName, formatBytes, formatDate } from '../lib/state.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import NavBar from '../components/NavBar.svelte';
  import NavButton from '../components/NavButton.svelte';
  import Icon from '../components/Icon.svelte';
  import { fly } from 'svelte/transition';
  import { iosEase } from '../lib/ease.js';
  let scrolled = $state(false);
  const totalBytes = $derived(app.projects.reduce((a, p) => a + stats(p).bytes, 0));
  const unexported = $derived(app.projects.filter((p) => !p.exportedAt && p.photos.length).length);
  function open(p) { app.tab = stats(p).pending ? 'inbox' : 'review'; app.projectId = p.id; }
  function covers(p) {
    const trash = mapById(p.mapId).slots.find((s) => s.isTrash)?.id;
    return p.photos.filter((x) => x.slot !== trash).slice(0, 4);
  }
</script>

<div class="screen">
  <NavBar title={t('app.projects')} large {scrolled}>
    {#snippet left()}<NavButton icon="gear" onclick={() => (app.settingsOpen = true)} />{/snippet}
    {#snippet right()}<NavButton icon="plus" onclick={() => (app.sheet = 'homeMenu')} />{/snippet}
  </NavBar>
  <div class="scroll" onscroll={(e) => (scrolled = e.currentTarget.scrollTop > 30)}>
    <h1 class="large">{t('app.projects')}</h1>

    {#if app.projects.length === 0}
      <div class="empty">
        <div class="ico"><img src="./icons/icon-180.png" alt="" /></div>
        <div class="et">{t('home.empty.title')}</div>
        <div class="eb">{t('home.empty.body')}</div>
        <button class="btn" onclick={() => (app.sheet = 'new')}><Icon name="plus" size={20} /> {t('home.new')}</button>
        <button class="link tap" onclick={() => (app.sheet = 'homeMenu')}>{t('home.importZip')}</button>
      </div>
    {:else}
      {#if unexported}
        <div class="warn"><Icon name="info" size={18} /> <span>{unexported === 1 ? t('home.warn1') : t('home.warn', { n: unexported })}</span></div>
      {/if}
      <div class="list">
        {#each app.projects as p, i (p.id)}
          {@const s = stats(p)}
          {@const cv = covers(p)}
          <button class="card" onclick={() => open(p)} in:fly={{ y: 16, duration: 450, delay: Math.min(i, 8) * 40, easing: iosEase }}>
            <div class="cover" class:mosaic={cv.length >= 4}>
              {#if cv.length >= 4}
                {#each cv as c (c.id)}<img src={c.thumb} alt="" />{/each}
              {:else if cv.length}
                <img src={cv[0].thumb} alt="" />
              {:else}
                <Icon name="image" size={28} stroke={1.5} />
              {/if}
            </div>
            <div class="info">
              <div class="name">{p.name}</div>
              <div class="meta">{mapName(mapById(p.mapId))} · {formatDate(p.createdAt)}</div>
              <div class="meta">{t('home.photos', { n: s.total })}{#if s.pending} · <span class="pend">{t('home.pending', { n: s.pending })}</span>{/if}</div>
              <div class="prog"><span style:width="{s.total ? ((s.total - s.pending) / s.total) * 100 : 0}%"></span></div>
              {#if p.exportedAt}
                <span class="badge green"><Icon name="check" size={12} stroke={3} /> {t('home.exported')}</span>
              {:else if s.total}
                <span class="badge orange">● {t('home.notExported')}</span>
              {/if}
            </div>
            <span class="chev"><Icon name="chevron" size={18} stroke={2.4} /></span>
          </button>
        {/each}
      </div>
    {/if}

    <div class="storage">
      <Icon name="shield" size={15} />
      <span>{t('home.storage', { size: formatBytes(totalBytes) })}{#if app.persisted} · {t('home.storage.protected')}{/if}</span>
    </div>
  </div>
</div>

<style>
  .large { font-size: 34px; font-weight: 700; letter-spacing: 0.01em; margin: 0; padding: 0 16px 8px; }
  .warn {
    display: flex; gap: 8px; align-items: center;
    margin: 4px 16px 6px; padding: 10px 12px; border-radius: 12px;
    background: color-mix(in srgb, var(--orange) 14%, transparent); color: var(--orange);
    font-size: 13px; font-weight: 500;
  }
  .list { display: grid; gap: 10px; padding: 8px 16px; }
  .card {
    display: flex; gap: 14px; align-items: center;
    background: var(--bg2); border-radius: 18px; padding: 12px;
    text-align: left; transition: transform 0.15s var(--ease), background 0.15s;
  }
  .card:active { transform: scale(0.98); background: var(--bg3); }
  .cover {
    width: 82px; height: 82px; flex: none; border-radius: 13px; overflow: hidden;
    background: var(--fill); display: grid; place-items: center; color: var(--label3);
  }
  .cover.mosaic { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 1.5px; }
  .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .info { flex: 1; min-width: 0; }
  .name { font-weight: 600; font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .meta { font-size: 13px; color: var(--label2); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pend { color: var(--orange); }
  .prog { height: 4px; border-radius: 2px; background: var(--fill); margin: 8px 0; overflow: hidden; }
  .prog span { display: block; height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.3s; }
  .chev { color: var(--label3); }
  .storage { display: flex; gap: 6px; align-items: center; justify-content: center; color: var(--label2); font-size: 12px; padding: 18px 16px calc(var(--sab) + 24px); }
  .empty { text-align: center; padding: 64px 32px; display: grid; justify-items: center; gap: 8px; }
  .ico img { width: 76px; height: 76px; border-radius: 18px; margin-bottom: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.18); }
  .et { font-size: 22px; font-weight: 700; }
  .eb { color: var(--label2); margin-bottom: 16px; }
  .link { color: var(--accent); font-size: 15px; padding: 12px; }
</style>
