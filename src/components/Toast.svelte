<script>
  import { app } from '../lib/state.svelte.js';
  import { fly } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
</script>

{#if app.toast}
  {#key app.toast.key}
    <div class="toast" class:accent={app.toast.tone === 'accent'} in:fly={{ y: -24, duration: 380, easing: backOut }} out:fly={{ y: -12, duration: 220 }}>{app.toast.text}</div>
  {/key}
{/if}

<style>
  .toast {
    position: absolute;
    top: calc(var(--sat) + 52px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 900;
    padding: 10px 18px;
    border-radius: 99px;
    background: rgba(40, 40, 42, 0.92);
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    white-space: nowrap;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
    pointer-events: none;
  }
  .toast.accent { color: var(--yellow); }
</style>
