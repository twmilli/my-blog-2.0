<script context="module">
  export function preload({ params, query }) {
    return this.fetch(`blog.json`)
      .then((r) => r.json())
      .then((posts) => ({ posts }));
  }
</script>

<script>
  import Fuse from "fuse.js";
  import PostItem from "../components/PostItem.svelte";

  export let posts;

  const options = {
    keys: ["title", "slug", "tag", "printDate", "excerpt"],
  };
  const fuse = new Fuse(posts, options);
  let query = "";
  let results = [];

  const handleInput = (e) => {
    query = e.currentTarget.value;
    results = query.trim()
      ? fuse.search(query).map((p) => p.item)
      : [];
  };
</script>

<style>
  .wrap {
    max-width: 56rem;
    margin: 0 auto;
    padding: 2rem 0;
  }

  h1 {
    font-family: var(--font-serif);
    font-size: clamp(2rem, 3.5vw, 2.8rem);
    margin: 0 0 1.5rem;
    letter-spacing: -0.02em;
  }

  .search-field {
    width: 100%;
    padding: 1rem 1.25rem;
    border-radius: 999px;
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    font-family: var(--font-sans);
    font-size: 1rem;
    box-shadow: var(--shadow-sm);
    transition: border-color var(--dur-2) var(--ease-out-soft),
      box-shadow var(--dur-2) var(--ease-out-soft);
  }

  .search-field:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 4px var(--accent-soft);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-top: 1.5rem;
  }

  @media (max-width: 720px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  .empty {
    color: var(--text-muted);
    font-family: var(--font-sans);
    margin-top: 1.5rem;
  }
</style>

<svelte:head>
  <title>Search — Taylor Milliman</title>
</svelte:head>

<div class="wrap rise">
  <h1>Search</h1>
  <input
    type="text"
    class="search-field"
    placeholder="Try 'food', 'code', 'travel'…"
    bind:value={query}
    on:input={handleInput} />

  {#if query && results.length === 0}
    <p class="empty">No matches. Try a different word.</p>
  {/if}

  <div class="grid">
    {#each results as post}
      <PostItem {post} />
    {/each}
  </div>
</div>
