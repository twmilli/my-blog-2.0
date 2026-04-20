<script>
  import Nav from "./Nav.svelte";

  export let segment;
</script>

<style>
  header {
    width: 100%;
    padding: 0.85rem 1.25rem;
    background: transparent;
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
