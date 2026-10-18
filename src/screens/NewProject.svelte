<script>
  import { app, MAPS, createProject, slugify, fileName, toast, nameTaken, mapName } from '../lib/state.svelte.js';
  import { t, locale } from '../lib/i18n.svelte.js';
  import Sheet from '../components/Sheet.svelte';
  import NavButton from '../components/NavButton.svelte';
  import Icon from '../components/Icon.svelte';
  const today = new Date().toLocaleDateString(locale(), { day: '2-digit', month: '2-digit' }).replace('/', '-');
  let name = $state('');
  let mapId = $state(MAPS[0].id);
  let input;
  const slug = $derived(slugify(name));
  const taken = $derived(slug.length > 0 && nameTaken(name));
  const valid = $derived(slug.length > 0 && !taken);
  const example = $derived.by(() => {
    const map = MAPS.find((m) => m.id === mapId);
    const slot = map.slots.find((s) => /^T0?10$/.test(s.folder)) ?? map.slots[3];
    return fileName({ slug: slug || 'Projeto', mapId }, slot, 1);
  });
  const close = () => (app.sheet = null);
  function create() {
    if (!valid) return;
    const p = createProject(name, mapId);
    app.sheet = null;
    app.tab = 'inbox';
    setTimeout(() => (app.projectId = p.id), 150);
    toast(t('new.created'));
  }
  const folders = (m) => m.slots.filter((s) => !s.isInbox).length;
  $effect(() => { setTimeout(() => input?.focus(), 420); });
</script>

<Sheet onclose={close}>
  <div class="head">
    <NavButton label={t('app.cancel')} onclick={close} />
    <div class="t">{t('new.title')}</div>
    <NavButton label={t('new.create')} bold disabled={!valid} onclick={create} />
  </div>
  <div class="body">
    <div class="section-title">{t('new.name')}</div>
    <div class="group">
      <label class="row">
        <input bind:this={input} class="grow" bind:value={name} placeholder={t('new.placeholder', { d: today })} autocomplete="off" autocapitalize="words" enterkeyhint="done" onkeydown={(e) => e.key === 'Enter' && create()} />
      </label>
    </div>
    {#if name && !valid}
      <div class="foot err">{taken ? t('new.exists') : t('new.invalid')}</div>
    {:else}
      <div class="foot">{t('new.fileNames')} <b>{example}</b></div>
    {/if}

    <div class="section-title">{t('new.map')}</div>
    <div class="group">
      {#each MAPS as m}
        <button class="row map" onclick={() => (mapId = m.id)}>
          <div class="grow">
            <div>{mapName(m)}</div>
            <div class="sub">{t('new.folders', { n: folders(m) })}{#if m.slots.some((s) => s.group)} · {t('new.groups', { g: [...new Set(m.slots.map((s) => s.group).filter(Boolean))].join(' / ') })}{/if}</div>
          </div>
          {#if mapId === m.id}<span class="ck"><Icon name="check" size={22} stroke={2.6} /></span>{/if}
        </button>
      {/each}
    </div>
    <div class="foot">{t('new.mapHint')}</div>
  </div>
</Sheet>

<style>
  .head { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 8px; }
  .head :global(.nb:last-child) { justify-self: end; }
  .t { font-weight: 600; }
  .body { overflow-y: auto; padding-bottom: 32px; }
  input { border: 0; outline: 0; background: none; height: 44px; font-size: 17px; -webkit-user-select: text; user-select: text; }
  input::placeholder { color: var(--label3); }
  .foot { font-size: 13px; color: var(--label2); padding: 7px 20px 0; }
  .foot b { color: var(--label); font-weight: 600; word-break: break-all; }
  .err { color: var(--red); }
  .map { min-height: 60px; }
  .sub { font-size: 13px; color: var(--label2); margin-top: 2px; }
  .ck { color: var(--accent); }
</style>
