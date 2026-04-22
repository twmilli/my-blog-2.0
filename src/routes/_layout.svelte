<script>
  import Header from "../components/Header.svelte";
  import { themeStore } from "../theme.js";

  export let segment;

  // Keep <html data-theme> in sync when the store changes.
  $: if (
    typeof document !== "undefined" &&
    $themeStore &&
    $themeStore.name
  ) {
    document.documentElement.setAttribute("data-theme", $themeStore.name);
  }
</script>

<style>
  .layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.25rem 1.25rem 4rem;
  }

  @media (max-width: 720px) {
    main {
      padding: 1rem 0.75rem 3rem;
    }
  }
</style>

<svelte:head>
  <title>Taylor Milliman</title>
</svelte:head>

<div class="layout">
  <Header {segment} />

  <main>
    <slot />
  </main>
</div>
