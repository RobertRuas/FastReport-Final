<script>
  // Folha de atalhos de teclado (como Ajuda → Atalhos no app de Mac).
  import { app } from '../lib/state.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { modLabel } from '../lib/keys.js';
  import Sheet from './Sheet.svelte';
  import NavButton from './NavButton.svelte';
  const M = modLabel;
  const groups = [
    { title: 'shortcuts.triage', items: [
      [['1…24', '↵'], 'shortcuts.slot'],
      [['0', '↵'], 'shortcuts.general'],
      [['↵'], 'shortcuts.bucket'],
      [['⇥'], 'shortcuts.group'],
      [[M, '⌫'], 'shortcuts.trash'],
      [['←', '→'], 'shortcuts.nav'],
      [['S'], 'shortcuts.skip'],
      [['R'], 'shortcuts.rotate'],
      [['F'], 'shortcuts.flip'],
      [['C'], 'shortcuts.crop'],
      [['+', '−', `${M} 0`], 'shortcuts.zoom'],
      [[M, 'Z'], 'shortcuts.undo'],
      [['Esc'], 'shortcuts.esc']
    ] },
    { title: 'shortcuts.project', items: [
      [['T'], 'shortcuts.startTriage'],
      [[`${M} 1`, `${M} 2`, `${M} 3`], 'shortcuts.tabs'],
      [[M, '+', '−'], 'shortcuts.thumbs'],
      [[M, 'E'], 'shortcuts.export'],
      [[M, 'Z'], 'shortcuts.undo'],
      [[M, '⇧', 'W'], 'shortcuts.close']
    ] },
    { title: 'shortcuts.viewer', items: [
      [['←', '→'], 'shortcuts.nav'],
      [['R', 'F'], 'shortcuts.rotateFlip'],
      [['M'], 'shortcuts.move'],
      [[M, '⌫'], 'shortcuts.trash'],
      [['Esc'], 'shortcuts.closeViewer']
    ] },
    { title: 'shortcuts.app', items: [
      [[M, 'N'], 'shortcuts.new'],
      [[M, 'O'], 'shortcuts.openFolder'],
      [[M, ','], 'shortcuts.settings'],
      [['?'], 'shortcuts.this']
    ] }
  ];
  const close = () => (app.shortcuts = false);
</script>

<Sheet onclose={close} max="940px">
  <div class="head">
    <span></span>
    <div class="t">{t('shortcuts.title')}</div>
    <NavButton label={t('app.ok')} bold onclick={close} />
  </div>
  <div class="body">
    <div class="cols">
      {#each groups as g}
        <section>
          <div class="section-title">{t(g.title)}</div>
          <div class="group">
            {#each g.items as [keys, label]}
              <div class="row">
                <span class="grow">{t(label)}</span>
                <span class="keys">{#each keys as k}<span class="kbd">{k}</span>{/each}</span>
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </div>
    <div class="foot">{t('shortcuts.hint')}</div>
  </div>
</Sheet>

<style>
  .head { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 8px; }
  .head :global(.nb) { justify-self: end; }
  .t { font-weight: 600; }
  .body { overflow-y: auto; padding-bottom: 28px; }
  .keys { display: inline-flex; gap: 4px; flex: none; }
  .row { font-size: 15px; }
  .foot { font-size: 13px; color: var(--label2); padding: 14px 20px 0; }
  @media (min-width: 900px) {
    .cols { display: grid; grid-template-columns: 1fr 1fr; align-items: start; }
  }
</style>
