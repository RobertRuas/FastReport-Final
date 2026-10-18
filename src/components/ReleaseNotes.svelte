<script>
  // Notas da versão (substitui a janela de novidades do Sparkle no Mac).
  import { app, APP_VERSION } from '../lib/state.svelte.js';
  import { t, lang, locale } from '../lib/i18n.svelte.js';
  import { RELEASES } from '../lib/releases.js';
  import Sheet from './Sheet.svelte';
  import NavButton from './NavButton.svelte';
  import Icon from './Icon.svelte';
  const close = () => (app.notes = false);
  const date = (d) => new Date(d + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
</script>

<Sheet onclose={close}>
  <div class="head">
    <span></span>
    <div class="t">{t('notes.title')}</div>
    <NavButton label={t('app.ok')} bold onclick={close} />
  </div>
  <div class="body">
    <div class="hero">
      <span class="ic"><Icon name="sparkle" size={26} /></span>
      <div class="v">FastReport {APP_VERSION}</div>
    </div>
    {#each RELEASES as r, i}
      <div class="section-title">{r.version}{#if r.version === APP_VERSION} · {t('notes.current')}{/if} <span class="d">· {date(r.date)}</span></div>
      <div class="group">
        {#each r[lang.code] ?? r.pt as line}
          <div class="row"><span class="dot" class:new={i === 0}></span><span class="grow">{line}</span></div>
        {/each}
      </div>
    {/each}
  </div>
</Sheet>

<style>
  .head { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 8px; }
  .head :global(.nb) { justify-self: end; }
  .t { font-weight: 600; }
  .body { overflow-y: auto; padding-bottom: 28px; }
  .hero { display: grid; justify-items: center; gap: 6px; padding: 10px 16px 4px; }
  .ic { width: 52px; height: 52px; border-radius: 14px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); }
  .v { font-weight: 700; font-size: 20px; }
  .d { text-transform: none; }
  .row { align-items: flex-start; padding-top: 11px; padding-bottom: 11px; font-size: 15px; line-height: 1.35; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--label3); margin-top: 7px; flex: none; }
  .dot.new { background: var(--accent); }
</style>
