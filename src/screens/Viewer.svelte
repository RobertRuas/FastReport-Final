<script>
  import { app, current, mapById, photosIn, slotLabel, fileName, movePhoto, editPhoto, toast, orderedSlots } from '../lib/state.svelte.js';
  import Icon from '../components/Icon.svelte';
  import { fade, scale as zoom } from 'svelte/transition';
  import { iosEase } from '../lib/ease.js';
  import { t } from '../lib/i18n.svelte.js';

  const project = $derived(current());
  const map = $derived(mapById(project.mapId));
  const slot = $derived(map.slots.find((s) => s.id === app.viewer.slotId));
  const list = $derived(photosIn(project, slot.id));
  const index = $derived(Math.min(app.viewer.index, list.length - 1));
  const photo = $derived(list[index]);
  const name = $derived(slot.isInbox || slot.isTrash ? t('viewer.noName') : fileName(project, slot, index + 1));

  let scale = $state(1), tx = $state(0), ty = $state(0), sw = $state(0), sy = $state(0);
  let smooth = $state(false);
  // Carrossel: anterior, atual e seguinte lado a lado; o trilho desliza com o dedo.
  const GAP = 20;
  let W = $state(innerWidth);
  let shift = $state(0), sliding = $state(false);
  const slides = $derived([-1, 0, 1].map((k) => ({ k, p: list[index + k] })).filter((x) => x.p));
  let chrome = $state(true);
  let moving = $state(false);
  let el;

  let t0 = null, mode = null, lastTap = 0;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  function reset() { smooth = true; scale = 1; tx = 0; ty = 0; sw = 0; sy = 0; setTimeout(() => (smooth = false), 250); }

  function ts(e) {
    if (sliding) { mode = null; return; }
    smooth = false;
    if (e.touches.length === 2) {
      mode = 'pinch';
      t0 = { d: dist(e.touches), s: scale };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const now = Date.now();
      if (now - lastTap < 280) {
        smooth = true;
        if (scale > 1) { scale = 1; tx = 0; ty = 0; } else { scale = 2.5; }
        setTimeout(() => (smooth = false), 250);
        lastTap = 0; mode = null; return;
      }
      lastTap = now;
      mode = scale > 1 ? 'pan' : 'swipe';
      t0 = { x: t.clientX, y: t.clientY, tx, ty, axis: null, at: now, hist: [] };
    }
  }
  function tm(e) {
    if (!mode) return;
    e.preventDefault();
    if (mode === 'pinch' && e.touches.length === 2) {
      scale = Math.max(1, Math.min(5, t0.s * (dist(e.touches) / t0.d)));
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - t0.x, dy = t.clientY - t0.y;
      if (mode === 'pan') { tx = t0.tx + dx / scale; ty = t0.ty + dy / scale; }
      else {
        if (!t0.axis && Math.hypot(dx, dy) > 8) t0.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (t0.axis === 'x') {
          const edge = (dx > 0 && index === 0) || (dx < 0 && index === list.length - 1);
          sw = edge ? dx * 0.3 : dx;
          t0.hist.push([Date.now(), dx]);
          if (t0.hist.length > 5) t0.hist.shift();
        }
        if (t0.axis === 'y') sy = Math.max(0, dy);
      }
    }
  }
  function te(e) {
    if (e.touches.length) return;
    if (mode === 'swipe') {
      if (Math.abs(sw) < 6 && sy < 6 && Date.now() - lastTap < 250) setTimeout(() => { if (lastTap) chrome = !chrome; }, 290);
      if (sy > 110) { close(); return; }
      const h = t0.hist, v = h.length > 1 ? (h[h.length - 1][1] - h[0][1]) / Math.max(1, h[h.length - 1][0] - h[0][0]) : 0;
      const dir = sw < -W * 0.4 || (v < -0.35 && sw < -20) ? 1 : sw > W * 0.4 || (v > 0.35 && sw > 20) ? -1 : 0;
      if (dir && list[index + dir]) slide(dir);
      else reset();
    } else if (scale < 1.05) reset();
    mode = null;
  }

  function slide(dir) {
    sliding = true;
    shift = -dir * (W + GAP) - sw;
    setTimeout(() => {
      sliding = false;
      app.viewer.index = index + dir;
      shift = 0; sw = 0; sy = 0; scale = 1; tx = 0; ty = 0;
    }, 340);
  }

  $effect(() => {
    el.addEventListener('touchstart', ts, { passive: true });
    el.addEventListener('touchmove', tm, { passive: false });
    el.addEventListener('touchend', te);
    return () => { el.removeEventListener('touchstart', ts); el.removeEventListener('touchmove', tm); el.removeEventListener('touchend', te); };
  });

  function close() { app.viewer = null; }
  function moveTo(s) {
    moving = false;
    if (s.id === slot.id) return;
    movePhoto(project, photo.id, s.id);
    toast(`→ ${slotLabel(s)}`, 'accent');
    if (!photosIn(project, slot.id).length) close();
  }
  let editing = $state(false);
  async function edit(kind) {
    if (editing || !photo) return;
    editing = true;
    try { await editPhoto(project, photo, kind); } finally { editing = false; }
  }
  const targets = $derived(orderedSlots(map).filter((s) => !s.isInbox));
</script>

<div class="viewer" style:background="rgba(0,0,0,{1 - Math.min(sy / 400, 0.6)})" in:zoom={{ start: 0.92, duration: 320, easing: iosEase }} out:fade={{ duration: 200 }}>
  <div class="area" bind:this={el} bind:clientWidth={W}>
    <div class="track" class:sliding class:smooth style:transform="translate3d({sw + shift}px, 0, 0)">
      {#each slides as { k, p } (p.id)}
        <div class="slide" style:transform="translate3d({k * (W + GAP)}px, 0, 0)">
          <img
            src={p.full}
            alt=""
            class:smooth
            style:transform={k === 0 ? `translate(0, ${sy}px) scale(${scale * (1 - Math.min(sy / 1200, 0.25))}) translate(${tx}px, ${ty}px)` : null}
            draggable="false"
          />
        </div>
      {/each}
    </div>
  </div>

  {#if chrome}
    <header transition:fade={{ duration: 150 }}>
      <button class="ib" onclick={close} aria-label="close"><Icon name="close" size={22} stroke={2.4} /></button>
      <div class="mid">
        <div class="nm">{name}</div>
        <div class="sub">{slotLabel(slot)} · {t('viewer.of', { i: index + 1, n: list.length })}</div>
      </div>
      <span></span>
    </header>
    <footer transition:fade={{ duration: 150 }}>
      <button onclick={() => edit('rotate')} disabled={editing}><Icon name="rotate" size={22} /><span>{t('triage.rotate')}</span></button>
      <button onclick={() => edit('flip')} disabled={editing}><Icon name="flip" size={22} /><span>{t('triage.flip')}</span></button>
      <button onclick={() => (moving = true)}><Icon name="review" size={22} /><span>{t('viewer.move')}</span></button>
      {#if !slot.isTrash}
        <button class="red" onclick={() => moveTo(map.slots.find((s) => s.isTrash))}><Icon name="trash" size={22} /><span>{t('slot.trash')}</span></button>
      {/if}
    </footer>
  {/if}

  {#if moving}
    <div class="scrim" onclick={() => (moving = false)} role="presentation"></div>
    <div class="mv">
      <div class="mt">{t('viewer.moveTo')}</div>
      <div class="mgrid">
        {#each targets as s (s.id)}
          <button class:cur={s.id === slot.id} class:danger={s.isTrash} onclick={() => moveTo(s)}>{slotLabel(s, true)}{#if s.group}<small>{s.group}</small>{/if}</button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .viewer { position: absolute; inset: 0; z-index: 700; color: #fff; }
  .area { position: absolute; inset: 0; overflow: hidden; touch-action: none; display: grid; place-items: center; }
  .track { position: absolute; inset: 0; will-change: transform; }
  .track.smooth { transition: transform 0.3s var(--ease); }
  .track.sliding { transition: transform 0.34s var(--ease); }
  .slide { position: absolute; inset: 0; display: grid; place-items: center; }
  .slide img { max-width: 100%; max-height: 100%; object-fit: contain; will-change: transform; animation: none; }
  .slide img.smooth { transition: transform 0.25s var(--ease); }
  header {
    position: absolute; top: 0; left: 0; right: 0;
    display: grid; grid-template-columns: 52px 1fr 52px; align-items: center;
    padding-top: var(--sat); height: calc(var(--sat) + 56px);
    background: linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0));
  }
  .ib { height: 44px; display: grid; place-items: center; color: #fff; }
  .mid { text-align: center; min-width: 0; }
  .nm { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: 12px; color: rgba(255,255,255,0.65); }
  footer {
    position: absolute; left: 0; right: 0; bottom: 0;
    display: grid; grid-auto-flow: column; grid-auto-columns: 1fr;
    padding: 10px 8px calc(var(--sab) + 8px);
    background: linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.7));
  }
  footer button { display: grid; justify-items: center; gap: 3px; color: #fff; }
  footer span { font-size: 11px; }
  footer .red { color: #ff6961; }
  footer button:disabled { opacity: 0.4; }
  .scrim { position: absolute; inset: 0; background: rgba(0,0,0,0.4); }
  .mv {
    position: absolute; left: 8px; right: 8px; bottom: calc(var(--sab) + 8px);
    background: #1c1c1e; border-radius: 16px; padding: 12px; max-height: 60%; overflow-y: auto;
  }
  .mt { font-size: 13px; color: rgba(255,255,255,0.6); text-align: center; margin-bottom: 10px; }
  .mgrid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; }
  .mgrid button { height: 42px; border-radius: 8px; background: #2c2c2e; color: #fff; font-weight: 600; font-size: 14px; display: grid; place-content: center; line-height: 1.05; }
  .mgrid small { font-size: 9px; color: rgba(255,255,255,0.5); font-weight: 500; }
  .mgrid button.cur { background: var(--accent); }
  .mgrid button.danger { color: #ff6961; grid-column: span 2; }
</style>
