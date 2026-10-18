<script>
  import { app } from '../lib/state.svelte.js';
  import { fade, scale } from 'svelte/transition';
  function pick(a) {
    app.alert = null;
    a.run?.();
  }
</script>

{#if app.alert}
  <div class="scrim" transition:fade={{ duration: 180 }}></div>
  <div class="wrap">
    <div class="alert" transition:scale={{ start: 1.12, duration: 220, opacity: 0 }}>
      <div class="text">
        <div class="t">{app.alert.title}</div>
        {#if app.alert.body}<div class="b">{app.alert.body}</div>{/if}
      </div>
      <div class="actions" class:two={app.alert.actions.length === 2}>
        {#each app.alert.actions as a}
          <button class="a {a.style}" onclick={() => pick(a)}>{a.label}</button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.4); z-index: 950; }
  .wrap { position: absolute; inset: 0; display: grid; place-items: center; z-index: 951; pointer-events: none; }
  .alert {
    pointer-events: auto;
    width: 270px;
    border-radius: 14px;
    overflow: hidden;
    background: color-mix(in srgb, var(--bg2) 88%, transparent);
    -webkit-backdrop-filter: blur(30px);
    backdrop-filter: blur(30px);
    text-align: center;
  }
  .text { padding: 19px 16px 17px; }
  .t { font-weight: 600; font-size: 17px; }
  .b { font-size: 13px; margin-top: 4px; color: var(--label); line-height: 1.35; }
  .actions { display: grid; border-top: 0.5px solid var(--sep); }
  .actions.two { grid-template-columns: 1fr 1fr; }
  .a { height: 44px; color: var(--blue); font-size: 17px; }
  .a:active { background: var(--fill); }
  .actions.two .a + .a { border-left: 0.5px solid var(--sep); }
  .actions:not(.two) .a + .a { border-top: 0.5px solid var(--sep); }
  .a.destructive { color: var(--red); font-weight: 600; }
  .a.default { font-weight: 600; }
</style>
