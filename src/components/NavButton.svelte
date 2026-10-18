<script>
  import Icon from './Icon.svelte';
  let { icon = null, label = '', onclick, bold = false, color = 'var(--accent)', disabled = false } = $props();
</script>

<button class="nb tap" style:color {onclick} {disabled} class:bold aria-label={label || icon}>
  {#if icon}<Icon name={icon} size={icon === 'back' ? 26 : 24} stroke={icon === 'back' ? 2.4 : 2} />{/if}
  {#if label}<span>{label}</span>{/if}
</button>

<style>
  .nb {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    min-height: 44px;
    min-width: 36px;
    padding: 0 8px;
    font-size: 17px;
  }
  .nb.bold { font-weight: 600; }
  .nb:disabled { opacity: 0.3; }
</style>
