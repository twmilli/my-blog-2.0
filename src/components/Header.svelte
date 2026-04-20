<script>
  import Nav from "./Nav.svelte";

  export let segment;
</script>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 40;
    width: 100%;
    padding: 0.85rem 1.25rem;
    background: var(--bg-color-semitransparent);
    backdrop-filter: saturate(140%) blur(14px);
    -webkit-backdrop-filter: saturate(140%) blur(14px);
    border-bottom: 1px solid transparent;
    transition: border-color var(--dur-2) var(--ease-out-soft);
  }

  .inner {
    max-width: 1200px;
    margin: 0 auto;
  }

  @media (max-width: 720px) {
    header {
      padding: 0.6rem 0.75rem;
    }
  }
</style>

<header>
  <div class="inner">
    <Nav {segment} />
  </div>
</header>
