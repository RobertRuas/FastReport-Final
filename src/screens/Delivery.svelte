<script>
  // Entrega: arrastar cada foto para o relatório (Word, Pages…), pasta a pasta, marcando as já colocadas.
  // Igual ao quadro de Entrega do Mac; no modo pasta as marcações ficam em fastreport-delivery.json.
  import { app, mapById, orderedSlots, photosIn, slotLabel, fileName, isPlaced, setPlaced, resetPlaced, photoBlob, isFolder, confirmAlert, toast } from '../lib/state.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import PinchGrid from '../components/PinchGrid.svelte';
  import Icon from '../components/Icon.svelte';
  import ContextMenu from '../components/ContextMenu.svelte';

  let { project } = $props();
  const map = $derived(mapById(project.mapId));
  const slots = $derived(orderedSlots(map).filter((s) => !s.isInbox && !s.isTrash && photosIn(project, s.id).length));
  const all = $derived(slots.flatMap((s) => photosIn(project, s.id)));
  const placedCount = $derived(all.filter((ph) => isPlaced(project, ph)).length);
  let menu = $state(null); // { x, y, photo, slot, index }

  /** Nome final do ficheiro (o mesmo do ZIP ou do disco). */
  function nameOf(slot, ph, i) {
    return isFolder(project) ? ph.name : fileName(project, slot, i + 1);
  }

  // Arrastar para o Word/Pages: usa-se o arrasto nativo da própria imagem em tamanho real.
  // O Chrome entrega assim os bytes da foto à outra app (como ao arrastar uma imagem de um site).
  // Um "DownloadURL" com blob: ou HTML com data: chegavam ao destino mas a imagem não carregava.
  // A miniatura troca pela foto completa quando o rato passa por cima, antes do arrasto começar.
  // A foto arrastada precisa de um endereço que as outras apps consigam abrir.
  // Com o service worker ativo (app publicada) fica num endereço https real, com o nome final
  // (…/__drag/<id>/<nome>.jpeg), como uma imagem de qualquer site. Sem ele, vai como data:.
  let hot = $state({}); // id → endereço da foto completa
  const pending = new Set();
  async function warm(ph, slot, i) {
    if (hot[ph.id] || pending.has(ph.id)) return;
    pending.add(ph.id);
    try {
      const blob = await photoBlob(project, ph);
      let url;
      if (navigator.serviceWorker?.controller && 'caches' in window) {
        url = new URL(`./__drag/${ph.id}/${encodeURIComponent(nameOf(slot, ph, i))}`, location.href).href;
        const cache = await caches.open('fr-drag');
        await cache.put(url, new Response(blob, { headers: { 'Content-Type': 'image/jpeg', 'Content-Length': String(blob.size) } }));
      } else {
        url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
      }
      hot = { ...hot, [ph.id]: url };
    } catch (e) {
      console.warn('drag', e);
    } finally {
      pending.delete(ph.id);
    }
  }
  // Limpa as fotos preparadas ao sair da Entrega.
  $effect(() => () => { if ('caches' in window) caches.delete('fr-drag').catch(() => {}); });

  function dragend(e, ph) {
    // O destino aceitou a foto (copy): fica marcada como colocada.
    if (e.dataTransfer?.dropEffect && e.dataTransfer.dropEffect !== 'none') setPlaced(project, ph, true);
  }

  // A escrita começa logo no clique (o Safari e o Chrome exigem-no); o PNG é gerado dentro da promessa.
  async function toPng(ph) {
    const blob = await photoBlob(project, ph);
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    c.getContext('2d').drawImage(bmp, 0, 0);
    bmp.close?.();
    const png = await new Promise((res) => c.toBlob(res, 'image/png'));
    c.width = c.height = 0;
    return png;
  }
  async function copy(ph) {
    try {
      // A área de transferência só aceita PNG em todos os browsers.
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': toPng(ph) })]);
      setPlaced(project, ph, true);
      toast(t('delivery.copied'));
    } catch (e) {
      console.warn('copy', e);
      toast(t('delivery.copyFailed'), 'danger');
    }
  }

  function open(slot, i) { app.viewer = { slotId: slot.id, index: i }; }
  function context(e, slot, ph, i) {
    e.preventDefault();
    menu = { x: e.clientX, y: e.clientY, slot, ph, i };
  }
  function reset() {
    confirmAlert(t('delivery.reset.title'), t('delivery.reset.body'), t('delivery.reset'), () => resetPlaced(project));
  }
</script>

<div class="wrap">
  <div class="banner">
    <Icon name="delivery" size={18} />
    <span class="bt">{t('delivery.banner')}</span>
    <span class="cnt">{t('delivery.status', { n: placedCount, t: all.length })}</span>
    {#if placedCount}<button class="reset tap" onclick={reset}>{t('delivery.reset')}</button>{/if}
  </div>
  <div class="scroll">
    {#if !slots.length}
      <div class="empty">
        <div class="ei"><Icon name="delivery" size={48} stroke={1.4} /></div>
        <div class="db">{t('delivery.empty')}</div>
      </div>
    {:else}
      <PinchGrid>
        {#each slots as slot (slot.id)}
          {@const photos = photosIn(project, slot.id)}
          {@const done = photos.filter((ph) => isPlaced(project, ph)).length}
          <section class:special={slot.folder === 'General'}>
            <div class="sh">
              <span class="sl">{slotLabel(slot)}</span>
              <span class="c" class:ok={done === photos.length}>{done}/{photos.length}</span>
            </div>
            <div class="grid">
              {#each photos as ph, i (ph.id)}
                {@const on = isPlaced(project, ph)}
                <div
                  class="thumb cell"
                  class:on
                  title={nameOf(slot, ph, i)}
                  onpointerenter={() => warm(ph, slot, i)}
                  onpointerdown={() => warm(ph, slot, i)}
                  ondragend={(e) => dragend(e, ph)}
                  onclick={() => open(slot, i)}
                  oncontextmenu={(e) => context(e, slot, ph, i)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => { if (e.key === 'Enter') open(slot, i); if (e.key === ' ') { e.preventDefault(); setPlaced(project, ph); } }}
                >
                  <img class="drag" src={hot[ph.id] ?? ph.thumb} alt={nameOf(slot, ph, i)} loading="lazy" decoding="async" draggable="true" />
                  <button class="mark" class:on aria-label={on ? t('delivery.unmark') : t('delivery.mark')} onclick={(e) => { e.stopPropagation(); setPlaced(project, ph); }}>
                    <Icon name="check" size={13} stroke={3.2} />
                  </button>
                </div>
              {/each}
            </div>
          </section>
        {/each}
      </PinchGrid>
      <div class="foot">{t('delivery.hint')}</div>
    {/if}
  </div>
</div>

{#if menu}
  <ContextMenu x={menu.x} y={menu.y} onclose={() => (menu = null)} items={[
    { icon: 'check', label: isPlaced(project, menu.ph) ? t('delivery.unmark') : t('delivery.mark'), key: '␣', run: ((ph) => () => setPlaced(project, ph))(menu.ph) },
    { icon: 'copy', label: t('delivery.copy'), run: ((ph) => () => copy(ph))(menu.ph) },
    { icon: 'image', label: t('delivery.open'), key: '↵', run: ((sl, i) => () => open(sl, i))(menu.slot, menu.i) }
  ]} />
{/if}

<style>
  .wrap { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .banner {
    display: flex; align-items: center; gap: 10px; flex: none;
    padding: 10px 16px; background: var(--fill); color: var(--label2); font-size: 13px;
  }
  .bt { flex: 1; min-width: 0; }
  .cnt { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--label); white-space: nowrap; }
  .reset { color: var(--accent); font-weight: 600; white-space: nowrap; }
  section { margin: 12px 12px 4px; padding: 0 0 8px; border-radius: 12px; border: 1px solid var(--sep); overflow: hidden; background: var(--bg2); }
  section.special { border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
  .sh { display: flex; align-items: baseline; gap: 8px; padding: 10px 12px 8px; }
  .sl { font-weight: 700; font-size: 15px; }
  .c { font-size: 13px; color: var(--label); font-variant-numeric: tabular-nums; }
  .c.ok { color: var(--label2); }
  .grid { padding: 0 8px; gap: 4px; }
  .cell { border-radius: 4px; cursor: grab; }
  .cell img { transition: opacity 0.2s; }
  /* A imagem é a origem do arrasto (o CSS global desliga o arrasto e os cliques nas imagens). */
  .cell img.drag { pointer-events: auto; -webkit-user-drag: element; cursor: grab; }
  .cell.on img { opacity: 0.38; }
  .mark {
    position: absolute; top: 5px; right: 5px; width: 22px; height: 22px; border-radius: 50%;
    display: grid; place-items: center;
    background: rgba(0,0,0,0.35); color: transparent;
    box-shadow: inset 0 0 0 1.5px rgba(255,255,255,0.9);
    transition: background 0.15s, color 0.15s, opacity 0.15s;
  }
  .mark.on { background: var(--accent); color: #fff; box-shadow: none; }
  @media (hover: hover) {
    .mark:not(.on) { opacity: 0; }
    .cell:hover .mark { opacity: 1; }
  }
  .empty { display: grid; justify-items: center; gap: 10px; padding: 64px 28px; text-align: center; color: var(--label2); }
  .ei { color: var(--label3); }
  .foot { font-size: 12px; color: var(--label3); text-align: center; padding: 16px 24px 28px; }
</style>
