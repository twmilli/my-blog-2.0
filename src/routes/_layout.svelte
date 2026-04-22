<script>
  import Header from "../components/Header.svelte";
  import { themeStore } from "../theme.js";

  export let segment;

  // Keep <html data-theme> in sync when the store changes.
  $: if (typeof document !== "undefined" && $themeStore && $themeStore.name) {
    document.documentElement.setAttribute("data-theme", $themeStore.name);
    document.documentElement.setAttribute(
      "data-light-riff",
      String($themeStore.lightRiff ?? 1)
    );
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

  footer {
    color: var(--text-faint);
    font-size: 0.85rem;
    font-family: var(--font-sans);
    letter-spacing: 0.02em;
    margin: 0 auto;
    padding: 2rem 1.25rem 2.5rem;
    max-width: 1200px;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .foot-links {
    display: flex;
    gap: 1rem;
  }

  .foot-links a {
    color: var(--text-muted);
    text-decoration: none;
  }

  .foot-links a:hover {
    color: var(--text);
  }

  @media (max-width: 720px) {
    main {
      padding: 1rem 0.75rem 3rem;
    }
    footer {
      padding: 1.5rem 0.75rem 2rem;
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

  <footer>
    <span>© {new Date().getFullYear()} Taylor Milliman. Made in SF.</span>
    <span class="foot-links">
      <a href="https://taylor.substack.com/" target="_blank" rel="noopener noreferrer">Substack</a>
      <a href="https://twitter.com/TayTayTrey" target="_blank" rel="noopener noreferrer">Twitter</a>
      <a href="https://github.com/twmilli" target="_blank" rel="noopener noreferrer">GitHub</a>
    </span>
  </footer>
</div>
