<script>
  import Sortable from 'sortablejs';
  import { app, mapById, orderedSlots, groupsOf, photosIn, slotLabel, movePhoto, confirmAlert, toast, undo, emptyTrash } from '../lib/state.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { haptic } from '../lib/haptic.js';
  import PinchGrid from '../components/PinchGrid.svelte';
  import Icon from '../components/Icon.svelte';

  let { project } = $props();
  const map = $derived(mapById(project.mapId));
  const groups = $derived(groupsOf(map));
  let group = $state('all');
  const inboxSlot = $derived(map.slots.find((s) => s.isInbox));
  const slots = $derived(
    orderedSlots(map).filter((s) => !s.isInbox && (group === 'all' || !s.group || s.group === group))
  );
  const inbox = $derived(photosIn(project, inboxSlot.id));
  let justDragged = false;
  let dragging = $state(false);

  // Nas pastas o arrasto começa logo, mas só na horizontal: na vertical a lista continua a deslizar.
  // A faixa da Inbox desliza na horizontal, por isso mantém o premir longo.
  function sortable(node, slotId) {
    const strip = slotId === inboxSlot.id;
    const s = Sortable.create(node, {
      group: 'photos',
      animation: 240,
      easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
      delay: strip ? 220 : 0,
      delayOnTouchOnly: true,
      touchStartThreshold: 6,
      forceFallback: true,
      fallbackOnBody: true,
      fallbackTolerance: strip ? 2 : 8,
      scroll: true,
      scrollSensitivity: 55,
      scrollSpeed: 16,
      bubbleScroll: true,
      draggable: '.thumb',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onChoose() { if (strip) haptic(); },
      onStart() { if (!strip) haptic(); dragging = true; },
      onEnd(evt) {
        dragging = false;
        justDragged = true;
        setTimeout(() => (justDragged = false), 80);
        const { item, from, to, oldIndex, newIndex } = evt;
        // Repor o DOM e deixar o Svelte desenhar a partir do estado.
        item.remove();
        from.insertBefore(item, from.children[oldIndex] ?? null);
        if (from === to && oldIndex === newIndex) return;
        const toSlot = to.dataset.slot;
        movePhoto(project, item.dataset.id, toSlot, newIndex);
        if (from !== to) {
          const sl = map.slots.find((x) => x.id === toSlot);
          toast(`→ ${slotLabel(sl)}`, 'accent');
        }
      }
    });
    if (!strip) {
      // Decide a direção no primeiro movimento: vertical é deslizar (o Safari cancela o toque), horizontal é arrastar.
      let x0 = 0, y0 = 0, dir = null;
      const down = (e) => { x0 = e.clientX; y0 = e.clientY; dir = null; };
      node.addEventListener('pointerdown', down, true);
      const move = s._onTouchMove;
      s._onTouchMove = (e) => {
        if (!Sortable.active && dir !== 'x') {
          const t = e.touches ? e.touches[0] : e;
          const dx = Math.abs(t.clientX - x0), dy = Math.abs(t.clientY - y0);
          if (dir === 'y') return;
          if (Math.max(dx, dy) < 8) return;
          dir = dx > dy ? 'x' : 'y';
          if (dir === 'y') return;
        }
        move(e);
      };
      return { destroy: () => { node.removeEventListener('pointerdown', down, true); s.destroy(); } };
    }
    return { destroy: () => s.destroy() };
  }

  function view(slotId, i) {
    if (justDragged) return;
    app.viewer = { slotId, index: i };
  }

  function countInfo(slot, n) {
    if (slot.expectedCount) return { text: `${n}/${slot.expectedCount}`, tone: n === slot.expectedCount ? 'ok' : n === 0 ? 'none' : 'warn' };
    return { text: n ? String(n) : '—', tone: 'none' };
  }

  function clearTrash(slot) {
    const n = photosIn(project, slot.id).length;
    if (!n) return;
    confirmAlert(t('review.clearTrash.title'), t('review.clearTrash.body', { n }), t('review.clearTrash'), async () => {
      await emptyTrash(project);
      toast(t('review.trashCleared'));
    });
  }
</script>

<div class="wrap" class:dragging>
  {#if groups.length}
    <div class="seg-wrap">
      <div class="seg">
        {#each ['all', ...groups] as g}
          <button class:on={group === g} onclick={() => (group = g)}>{g === 'all' ? t('review.all') : g}</button>
        {/each}
      </div>
    </div>
  {/if}

  {#if inbox.length}
    <div class="strip-wrap">
      <div class="strip-head">
        <span>{t('slot.inbox')} · {inbox.length}</span>
        <span class="tip">{t('review.dragHint')}</span>
      </div>
      <div class="strip" data-slot={inboxSlot.id} use:sortable={inboxSlot.id}>
        {#each inbox.slice(0, 60) as ph, i (ph.id)}
          <div class="thumb" data-id={ph.id} onclick={() => view(inboxSlot.id, i)} role="presentation"><img src={ph.thumb} alt="" loading="lazy" /></div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="scroll">
    <PinchGrid>
      {#each slots as slot (slot.id)}
        {@const photos = photosIn(project, slot.id)}
        {@const c = countInfo(slot, photos.length)}
        <section class:trash={slot.isTrash}>
          <div class="sh">
            <span class="sl">{slotLabel(slot)}</span>
            <span class="cnt {c.tone}">{c.text}</span>
            {#if slot.isTrash && photos.length}
              <button class="clear tap" onclick={() => clearTrash(slot)}>{t('review.clearTrash')}</button>
            {/if}
          </div>
          <div class="grid list" class:empty={!photos.length} data-slot={slot.id} use:sortable={slot.id}>
            {#each photos as ph, i (ph.id)}
              <div class="thumb" data-id={ph.id} onclick={() => view(slot.id, i)} role="presentation">
                <img src={ph.thumb} alt="" loading="lazy" decoding="async" />
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </PinchGrid>
    <div class="foot">
      {#if project.undo.length}
        <button class="btn secondary" onclick={() => { undo(project); toast(t('app.undone')); }}><Icon name="undo" size={18} /> {t('review.undoLast')}</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .wrap { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .seg-wrap { padding: 8px 16px; flex: none; }
  .seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; background: var(--fill); border-radius: 9px; padding: 2px; }
  .seg button { height: 30px; border-radius: 7px; font-size: 13px; font-weight: 600; }
  .seg button.on { background: var(--bg2); box-shadow: 0 2px 6px rgba(0,0,0,0.12); }
  .strip-wrap { flex: none; background: var(--bg2); border-bottom: 0.5px solid var(--sep); padding: 8px 0 10px; }
  .strip-head { display: flex; justify-content: space-between; padding: 0 12px 6px; font-size: 13px; font-weight: 600; }
  .tip { color: var(--label2); font-weight: 400; font-size: 12px; }
  .strip { display: flex; gap: 3px; overflow-x: auto; padding: 0 12px; scrollbar-width: none; min-height: 64px; }
  .strip::-webkit-scrollbar { display: none; }
  .strip .thumb { width: 64px; height: 64px; flex: none; border-radius: 4px; }
  section { padding: 0 0 6px; }
  .sh {
    display: flex; align-items: baseline; gap: 8px; padding: 12px 14px 6px;
    position: sticky; top: 0; z-index: 3;
    background: color-mix(in srgb, var(--bg) 86%, transparent);
    -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
  }
  .sl { font-weight: 700; font-size: 15px; }
  .cnt { font-size: 13px; font-variant-numeric: tabular-nums; color: var(--label2); }
  .cnt.ok { color: var(--green); font-weight: 600; }
  .cnt.warn { color: var(--orange); font-weight: 600; }
  .clear { margin-left: auto; color: var(--red); font-size: 15px; }
  .list { min-height: 30px; padding: 0 2px; }
  .list.empty {
    margin: 0 12px;
    min-height: 44px;
    border: 1.5px dashed var(--fill2);
    border-radius: 8px;
  }
  .dragging .list.empty { border-color: var(--accent); background: var(--accent-soft); }
  .trash .thumb img { opacity: 0.55; }
  .foot { display: grid; justify-items: center; padding: 22px 16px 28px; }
  .foot .btn { height: 40px; font-size: 15px; }
</style>
