<script>
  // Menu de contexto (botão direito no computador).
  import { fade } from 'svelte/transition';
  import Icon from './Icon.svelte';
  let { x, y, items = [], onclose } = $props();
  const left = $derived(Math.min(x, innerWidth - 250));
  const top = $derived(Math.min(y, innerHeight - (items.length * 34 + 16)));
  function pick(it) { onclose?.(); it.run?.(); }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose?.()} onblur={() => onclose?.()} />

<div class="scrim" onclick={onclose} oncontextmenu={(e) => { e.preventDefault(); onclose?.(); }} role="presentation"></div>
<div class="cm" style:left="{left}px" style:top="{top}px" transition:fade={{ duration: 90 }} role="menu">
  {#each items as it}
    {#if it.sep}<div class="sep"></div>{:else}
      <button class:danger={it.danger} onclick={() => pick(it)} role="menuitem"><Icon name={it.icon ?? 'chevron'} size={16} /> <span>{it.label}</span>{#if it.key}<span class="k">{it.key}</span>{/if}</button>
    {/if}
  {/each}
</div>

<style>
  .scrim { position: fixed; inset: 0; z-index: 880; }
  .cm {
    position: fixed; z-index: 881; min-width: 230px; padding: 5px;
    border-radius: 10px; background: color-mix(in srgb, var(--bg2) 94%, transparent);
    -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);
    box-shadow: var(--shadow); border: 0.5px solid var(--sep);
  }
  button { display: flex; align-items: center; gap: 8px; width: 100%; height: 30px; padding: 0 10px; border-radius: 6px; font-size: 14px; text-align: left; }
  button span:first-of-type { flex: 1; }
  button:hover { background: var(--accent); color: #fff; }
  .danger { color: var(--red); }
  .k { font-size: 12px; opacity: 0.55; }
  .sep { height: 0.5px; background: var(--sep); margin: 4px 6px; }
</style>
