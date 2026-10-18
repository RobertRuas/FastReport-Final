<script>
  import { app, current, mapById, photosIn, slotLabel, groupsOf, movePhoto, undo, editPhoto, toast } from '../lib/state.svelte.js';
  import Icon from '../components/Icon.svelte';
  import CropOverlay from '../components/CropOverlay.svelte';
  import { iosEase } from '../lib/ease.js';
  import { t } from '../lib/i18n.svelte.js';
  import { haptic } from '../lib/haptic.js';

  const project = $derived(current());
  const map = $derived(mapById(project.mapId));
  const inboxId = $derived(map.slots.find((s) => s.isInbox).id);
  const list = $derived(photosIn(project, inboxId));
  const groups = $derived(groupsOf(map));
  let group = $state(app.group ?? groupsOf(mapById(current().mapId))[0] ?? null);
  $effect(() => { app.group = group; });

  const index = $derived(Math.min(app.triage.index, Math.max(0, list.length - 1)));
  const photo = $derived(list[index]);

  const general = $derived(map.slots.find((s) => s.folder === 'General'));
  const trash = $derived(map.slots.find((s) => s.isTrash));
  const extras = $derived(map.slots.filter((s) => !s.isInbox && !s.isTrash && s !== general && !s.group && !/^T\d+$/i.test(s.folder)));
  const numbered = $derived(map.slots.filter((s) => (group ? s.group === group : !s.group) && /^T\d+$/i.test(s.folder)));

  let flash = $state(null);
  let ghost = $state(null);
  let busy = $state(false);
  let cropping = $state(false);
  let dx = $state(0);
  let anim = $state(false);
  let enter = $state('pop'); // como entra a foto seguinte

  function slide(node) {
    return { duration: 500, easing: iosEase, css: (t) => `transform: translate3d(0,${(1 - t) * 100}%,0)` };
  }

  function count(slot) {
    const n = photosIn(project, slot.id).length;
    return slot.expectedCount ? `${n}/${slot.expectedCount}` : n ? String(n) : '';
  }
  function full(slot) {
    return slot.expectedCount && photosIn(project, slot.id).length >= slot.expectedCount;
  }

  function classify(slot) {
    if (!photo || busy || cropping) return;
    haptic();
    enter = 'pop';
    ghost = { src: photo.full, key: Math.random(), trash: slot.isTrash };
    flash = { text: slot.isTrash ? t('slot.trash') : slotLabel(slot, true), key: Math.random(), trash: slot.isTrash };
    movePhoto(project, photo.id, slot.id);
    setTimeout(() => (ghost = null), 380);
    setTimeout(() => (flash = null), 700);
  }

  function doUndo() {
    enter = 'back';
    const last = undo(project);
    if (!last) return toast(t('app.nothingToUndo'));
    if (last.type === 'move' && last.slot === inboxId) app.triage.index = last.index;
    toast(t('app.undone'));
  }

  function go(step) {
    const next = index + step;
    if (next < 0 || next >= list.length) { dx = 0; return; }
    enter = 'none';
    anim = true;
    dx = step > 0 ? -window.innerWidth : window.innerWidth;
    setTimeout(() => {
      anim = false;
      app.triage.index = next;
      dx = step > 0 ? window.innerWidth * 0.3 : -window.innerWidth * 0.3;
      requestAnimationFrame(() => { anim = true; dx = 0; setTimeout(() => (anim = false), 220); });
    }, 160);
  }

  let sx = null, sy = 0;
  function pd(e) { if (cropping) return; sx = e.clientX; sy = e.clientY; anim = false; }
  function pm(e) { if (sx == null) return; dx = e.clientX - sx; }
  function pu(e) {
    if (sx == null) return;
    const moved = dx;
    sx = null;
    if (Math.abs(moved) > 70) go(moved < 0 ? 1 : -1);
    else { anim = true; dx = 0; setTimeout(() => (anim = false), 220); }
  }

  async function edit(kind, crop) {
    if (!photo || busy) return;
    busy = true;
    enter = 'fade';
    try { await editPhoto(project, photo, kind, crop); } finally { busy = false; }
  }
  function applyCrop(rect) { cropping = false; edit('crop', rect); }

  function close() { app.triage = null; }

  // Mantém o ecrã ligado durante a triagem (quando o iOS o permite).
  $effect(() => {
    let lock = null, alive = true;
    const get = async () => {
      try { if (document.visibilityState === 'visible') lock = await navigator.wakeLock?.request('screen'); } catch {}
      if (!alive) lock?.release?.();
    };
    get();
    document.addEventListener('visibilitychange', get);
    return () => { alive = false; document.removeEventListener('visibilitychange', get); lock?.release?.().catch?.(() => {}); };
  });
  const total = $derived(project.photos.length);
</script>

<div class="triage" transition:slide>
  <header>
    <button class="ib" onclick={close} aria-label={t('triage.close')}><Icon name="close" size={22} stroke={2.4} /></button>
    <div class="mid">
      <div class="pos">{list.length ? `${index + 1} / ${list.length}` : '0'}</div>
      <div class="sub">{t('slot.inbox')}</div>
    </div>
    <button class="ib" onclick={doUndo} disabled={!project.undo.length} aria-label="undo"><Icon name="undo" size={22} /></button>
  </header>

  <div class="progress"><span style:width="{total ? ((total - list.length) / total) * 100 : 0}%"></span></div>

  <div class="stage" onpointerdown={pd} onpointermove={pm} onpointerup={pu} onpointercancel={pu} role="presentation">
    {#if photo}
      {#key photo.id + photo.full}
        <img class="main enter-{enter}" class:anim src={photo.full} alt="" style:transform="translateX({dx}px)" draggable="false" />
      {/key}
      {#if cropping}
        <CropOverlay src={photo.full} w={photo.w} h={photo.h} oncancel={() => (cropping = false)} onapply={applyCrop} />
      {/if}
    {:else}
      <div class="done">
        <div class="ok"><Icon name="check" size={40} stroke={2.6} /></div>
        <div class="dt">{t('triage.done.title')}</div>
        <div class="db">{t('triage.done.body')}</div>
        <button class="btn" onclick={() => { app.tab = 'review'; close(); }}>{t('project.goReview')}</button>
      </div>
    {/if}
    {#if ghost}
      {#key ghost.key}<img class="ghost" class:trash={ghost.trash} src={ghost.src} alt="" />{/key}
    {/if}
    {#if flash}
      {#key flash.key}<div class="flash" class:trash={flash.trash}>{flash.text}</div>{/key}
    {/if}
    {#if busy}<div class="busy"><span></span></div>{/if}
  </div>

  {#if !cropping}
    <div class="tools">
      <button onclick={() => edit('rotate')} disabled={!photo}><Icon name="rotate" size={22} /><span>{t('triage.rotate')}</span></button>
      <button onclick={() => edit('flip')} disabled={!photo}><Icon name="flip" size={22} /><span>{t('triage.flip')}</span></button>
      <button onclick={() => (cropping = true)} disabled={!photo}><Icon name="crop" size={22} /><span>{t('triage.crop')}</span></button>
      <button onclick={() => go(-1)} disabled={index === 0}><Icon name="prev" size={22} /><span>{t('triage.prev')}</span></button>
      <button onclick={() => go(1)} disabled={index >= list.length - 1}><Icon name="chevron" size={22} /><span>{t('triage.skip')}</span></button>
    </div>

    <div class="pad">
      {#if groups.length}
        <div class="seg">
          {#each groups as g}<button class:on={group === g} onclick={() => (group = g)}>{g}</button>{/each}
        </div>
      {/if}
      <div class="keys">
        {#each numbered as s (s.id)}
          <button class="key" class:full={full(s)} onclick={() => classify(s)} disabled={!photo}>
            <span class="kl">{s.folder.replace(/^T0?/, '')}</span>
            <span class="kc">{count(s)}</span>
          </button>
        {/each}
      </div>
      <div class="row2" style:grid-template-columns="2fr {extras.map(() => '1fr').join(' ')} 2fr">
        <button class="key wide" onclick={() => classify(general)} disabled={!photo}><span class="kl">{t('slot.general')}</span><span class="kc">{count(general)}</span></button>
        {#each extras as s (s.id)}
          <button class="key wide" onclick={() => classify(s)} disabled={!photo}><span class="kl">{s.folder}</span><span class="kc">{count(s)}</span></button>
        {/each}
        <button class="key wide danger" onclick={() => classify(trash)} disabled={!photo}><Icon name="trash" size={18} /><span class="kl">{t('slot.trash')}</span></button>
      </div>
    </div>
  {/if}
</div>

<style>
  .triage {
    position: absolute; inset: 0; z-index: 600;
    background: #000; color: #fff;
    display: flex; flex-direction: column;
    padding-bottom: var(--sab);
  }
  header {
    display: grid; grid-template-columns: 52px 1fr 52px; align-items: center;
    padding: var(--sat) 4px 0; height: calc(var(--sat) + 48px);
  }
  .ib { height: 44px; display: grid; place-items: center; color: #fff; }
  .ib:disabled { opacity: 0.3; }
  .mid { text-align: center; }
  .pos { font-weight: 600; font-variant-numeric: tabular-nums; }
  .sub { font-size: 12px; color: rgba(255,255,255,0.6); }
  .progress { height: 2px; background: rgba(255,255,255,0.12); flex: none; }
  .progress span { display: block; height: 100%; background: var(--yellow); transition: width 0.3s var(--ease); }
  .stage { flex: 1; min-height: 0; position: relative; overflow: hidden; touch-action: none; }
  .main { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
  .main.anim { transition: transform 0.24s var(--ease); }
  .enter-pop { animation: enterPop 0.34s var(--ease) both; }
  .enter-back { animation: enterBack 0.34s var(--ease) both; }
  .enter-fade { animation: enterFade 0.25s ease-out both; }
  @keyframes enterPop { from { opacity: 0; transform: scale(0.93); } }
  @keyframes enterBack { from { opacity: 0; transform: translateY(30%) scale(0.5); } }
  @keyframes enterFade { from { opacity: 0.4; } }
  .ghost {
    position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain;
    animation: away 0.42s var(--ease) forwards; pointer-events: none;
  }
  .ghost.trash { animation-name: awayTrash; }
  @keyframes away { to { transform: translateY(55%) scale(0.3); opacity: 0; } }
  @keyframes awayTrash { to { transform: translate(40%, 50%) scale(0.2) rotate(12deg); opacity: 0; } }
  .flash {
    position: absolute; left: 50%; top: 42%;
    transform: translate(-50%, -50%);
    font-size: 44px; font-weight: 800; color: var(--yellow);
    text-shadow: 0 2px 18px rgba(0,0,0,0.7);
    animation: pop 0.7s ease-out forwards; pointer-events: none;
  }
  .flash.trash { color: #ff453a; }
  @keyframes pop {
    0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
    20% { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
    70% { opacity: 1; }
    100% { transform: translate(-50%, -60%) scale(1); opacity: 0; }
  }
  .busy { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,0.3); }
  .busy span { width: 28px; height: 28px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.25); border-top-color: #fff; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .done { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 6px; text-align: center; padding: 24px; }
  .ok { color: #30d158; }
  .dt { font-size: 22px; font-weight: 700; }
  .db { color: rgba(255,255,255,0.6); margin-bottom: 16px; }
  .tools { display: grid; grid-template-columns: repeat(5, 1fr); padding: 6px 4px 2px; }
  .tools button { display: grid; justify-items: center; gap: 2px; color: rgba(255,255,255,0.9); padding: 4px 0; }
  .tools button:disabled { opacity: 0.3; }
  .tools span { font-size: 10px; }
  .pad { padding: 6px 6px 6px; background: #111; border-top: 0.5px solid #2a2a2a; }
  .seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; background: #2a2a2c; border-radius: 9px; padding: 2px; margin-bottom: 6px; }
  .seg button { height: 30px; border-radius: 7px; font-size: 14px; font-weight: 700; color: #fff; }
  .seg button.on { background: var(--yellow); color: #000; }
  .keys { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; }
  .row2 { display: grid; gap: 5px; margin-top: 5px; }
  .key {
    height: 46px; border-radius: 9px;
    background: #2c2c2e; color: #fff;
    display: grid; align-content: center; justify-items: center;
    line-height: 1.05;
    transition: transform 0.08s, background 0.08s;
  }
  .key:active { transform: scale(0.92); background: #48484a; }
  .key:disabled { opacity: 0.35; }
  .key.full { background: #1d3b2a; }
  .kl { font-size: 19px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .kc { font-size: 10px; color: rgba(255,255,255,0.55); min-height: 11px; font-variant-numeric: tabular-nums; }
  .key.full .kc { color: #30d158; }
  .wide { grid-auto-flow: column; gap: 6px; align-items: center; justify-content: center; }
  .wide .kl { font-size: 16px; }
  .danger { background: #3a1d1d; color: #ff6961; }

  /* Paisagem: foto à esquerda, ferramentas e teclas à direita. */
  @media (orientation: landscape) and (max-height: 600px) {
    .triage {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(300px, 40%);
      grid-template-rows: auto auto auto minmax(0, 1fr);
    }
    header { grid-column: 1 / -1; height: calc(var(--sat) + 44px); }
    .progress { grid-column: 1 / -1; }
    .stage { grid-column: 1; grid-row: 3 / 5; }
    .stage:last-child { grid-column: 1 / -1; }
    .tools { grid-column: 2; grid-row: 3; background: #111; padding-top: 4px; }
    .pad { grid-column: 2; grid-row: 4; overflow-y: auto; border-top: 0; border-left: 0.5px solid #2a2a2a; }
    .tools { border-left: 0.5px solid #2a2a2a; }
    .key { height: 38px; }
    .seg button { height: 28px; }
  }
</style>
