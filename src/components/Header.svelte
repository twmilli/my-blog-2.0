<script>
  import Nav from "./Nav.svelte";

  export let segment;
</script>

<style>
  header {
    display: flex;
    margin: 0 auto;
    max-width: 1400px;
    padding: 1em;
    width: 100%;
    border-bottom: 2px solid var(--brand-color-primary);
  }
</style>

<header>
  <Nav {segment} />
</header>
