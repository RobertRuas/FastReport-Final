<script>
  import { app, formatBytes, stats, setCols, setLang, setTheme, setUi, createDemo, colsNow, UI_SIZES, deviceLang } from '../lib/state.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { offlineCapable } from '../lib/pwa.js';
  import NavBar from '../components/NavBar.svelte';
  import NavButton from '../components/NavButton.svelte';
  import Icon from '../components/Icon.svelte';
  const bytes = $derived(app.projects.reduce((a, p) => a + stats(p).bytes, 0));
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const offline = offlineCapable();
  const themes = ['auto', 'light', 'dark'];
  const langs = [{ code: 'auto', label: () => t('settings.autoLang') }, { code: 'pt', label: () => 'Português' }, { code: 'en', label: () => 'English' }];
  const colOptions = ['auto', 3, 4, 5, 6, 7, 8];
  // Tamanho aproximado de um JPEG a 85% (cresce com a área).
  async function demo() {
    const p = await createDemo();
    app.settingsOpen = false;
    setTimeout(() => { app.tab = 'inbox'; app.projectId = p.id; }, 300);
  }
</script>

<NavBar title={t('app.settings')} scrolled>
  {#snippet left()}<NavButton icon="back" label={t('app.projects')} onclick={() => (app.settingsOpen = false)} />{/snippet}
</NavBar>
<div class="scroll">
  <div class="section-title">{t('settings.theme')}</div>
  <div class="group">
    {#each themes as th}
      <button class="row" onclick={() => setTheme(th)}>
        <span class="swatch {th}"></span>
        <span class="grow">{t(`settings.theme.${th}`)}</span>
        {#if app.theme === th}<span class="ck"><Icon name="check" size={20} stroke={2.6} /></span>{/if}
      </button>
    {/each}
  </div>

  <div class="section-title">{t('settings.language')}</div>
  <div class="group">
    {#each langs as l}
      <button class="row" onclick={() => setLang(l.code)}>
        <div class="grow">{l.label()}{#if l.code === 'auto'}<div class="sub">{deviceLang() === 'pt' ? 'Português' : 'English'}</div>{/if}</div>
        {#if app.langPref === l.code}<span class="ck"><Icon name="check" size={20} stroke={2.6} /></span>{/if}
      </button>
    {/each}
  </div>

  <div class="section-title">{t('settings.cols')}</div>
  <div class="group pad">
    <div class="seg">
      {#each colOptions as c}
        <button class:on={app.cols === c} onclick={() => setCols(c)}>{c === 'auto' ? t('settings.auto') : c}</button>
      {/each}
    </div>
    <div class="preview" style:--cols={colsNow()}>
      {#each Array(colsNow()) as _, i (i)}<span></span>{/each}
    </div>
  </div>
  <div class="foot">{t('settings.colsAutoHint')}</div>

  <div class="section-title">{t('settings.uiSize')}</div>
  <div class="group pad">
    <div class="sizes">
      {#each UI_SIZES as v, i}
        <button class:on={app.ui === v} onclick={() => setUi(v)} aria-label={t(`settings.ui.${i}`)}>
          <span style:font-size="{13 + i * 3}px">Aa</span>
        </button>
      {/each}
    </div>
    <div class="sizename">{t(`settings.ui.${UI_SIZES.indexOf(app.ui)}`)}</div>
  </div>
  <div class="foot">{t('settings.uiHint')}</div>

  <div class="section-title">{t('settings.storage')}</div>
  <div class="group">
    <div class="row"><span class="grow">{t('settings.used')}</span><span class="value">{formatBytes(bytes)}</span></div>
    <div class="row"><span class="grow">{t('settings.persist')}</span>
      {#if app.persisted}<span class="value on"><Icon name="shield" size={16} /> {t('settings.persist.on')}</span>{:else}<span class="value">{t('settings.persist.off')}</span>{/if}
    </div>
    <div class="row"><span class="grow">{t('settings.offline')}</span><span class="value" class:on={offline}>{offline ? t('settings.offline.on') : t('settings.offline.off')}</span></div>
    <div class="row"><span class="grow">{t('settings.installed')}</span><span class="value">{standalone ? t('settings.yes') : t('settings.no')}</span></div>
  </div>
  <div class="foot">{t('settings.storageHint')}</div>

  <div class="section-title">{t('settings.about')}</div>
  <div class="group">
    <button class="row tap" onclick={demo}>
      <span class="grow link">{t('settings.demo')}</span><Icon name="photos" size={18} />
    </button>
    <div class="row"><span class="grow">{t('settings.version')}</span><span class="value">1.5.0</span></div>
  </div>
  <div style="height: calc(var(--sab) + 30px)"></div>
</div>

<style>
  .foot { font-size: 13px; color: var(--label2); padding: 7px 20px 0; line-height: 1.35; }
  .on { color: var(--green); display: inline-flex; align-items: center; gap: 4px; }
  .ck { color: var(--accent); display: grid; animation: pop 0.25s var(--ease); }
  @keyframes pop { from { transform: scale(0.5); opacity: 0; } }
  .link { color: var(--accent); }
  .sub { font-size: 13px; color: var(--label2); margin-top: 1px; }
  .row:has(.sub) { min-height: 56px; }
  .swatch { width: 26px; height: 26px; border-radius: 7px; flex: none; border: 0.5px solid var(--sep); }
  .swatch.light { background: #f2f2f7; }
  .swatch.dark { background: #1c1c1e; }
  .swatch.auto { background: linear-gradient(135deg, #f2f2f7 50%, #1c1c1e 50%); }
  .pad { padding: 12px; }
  .seg { display: grid; grid-template-columns: 2.4fr repeat(6, 1fr); background: var(--fill); border-radius: 9px; padding: 2px; }
  .seg button { height: 30px; display: flex; align-items: center; justify-content: center; padding: 0 6px; white-space: nowrap; border-radius: 7px; font-size: 13px; font-weight: 600; transition: background 0.25s var(--ease), box-shadow 0.25s; }
  .seg button.on { background: var(--bg2); box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
  .preview { display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: 3px; margin-top: 12px; }
  .preview span { height: 26px; border-radius: 3px; background: var(--accent); opacity: 0.35; animation: pop 0.3s var(--ease); }
  .sizes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .sizes button { height: 56px; border-radius: 10px; background: var(--fill); display: grid; place-items: center; font-weight: 600; color: var(--label2); transition: background 0.25s var(--ease), color 0.25s, transform 0.15s; }
  .sizes button:active { transform: scale(0.95); }
  .sizes button.on { background: var(--accent-soft); color: var(--accent); box-shadow: inset 0 0 0 2px var(--accent); }
  .sizename { text-align: center; font-size: 13px; color: var(--label2); margin-top: 10px; }
</style>
