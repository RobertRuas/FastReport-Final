<script>
  let { title = '', large = false, left, right, scrolled = false, dark = false } = $props();
</script>

<header class="nav" class:scrolled class:dark>
  <div class="bar">
    <div class="side left">{@render left?.()}</div>
    <div class="title" class:hidden={large && !scrolled}>{title}</div>
    <div class="side right">{@render right?.()}</div>
  </div>
</header>

<style>
  .nav {
    position: relative;
    z-index: 20;
    padding-top: var(--sat);
    background: var(--bg);
    transition: background 0.2s;
  }
  .nav::after {
    content: '';
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 0.5px;
    background: var(--sep);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .nav.scrolled {
    background: var(--bar);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    backdrop-filter: saturate(180%) blur(20px);
  }
  .nav.scrolled::after { opacity: 1; }
  .bar {
    height: 44px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 8px;
  }
  .side { display: flex; align-items: center; gap: 4px; }
  .right { justify-content: flex-end; }
  .title {
    font-weight: 600;
    text-align: center;
    max-width: 220px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: opacity 0.2s;
  }
  .title.hidden { opacity: 0; }
</style>
