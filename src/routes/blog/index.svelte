<script context="module">
  export function preload({ params, query }) {
    return this.fetch(`blog.json`)
      .then((r) => r.json())
      .then((posts) => ({ posts }));
  }
</script>

<script>
  import PostItem from "../../components/PostItem.svelte";
  export let posts;
</script>

<style>
  .head {
    max-width: 56rem;
    margin: 0 auto 2.5rem;
    padding: 2rem 0 0.5rem;
  }

  .head .eyebrow {
    font-family: var(--font-sans);
    font-size: 0.8rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
  }

  .head h1 {
    font-family: var(--font-serif);
    font-size: clamp(2.4rem, 4vw, 3.4rem);
    margin: 0 0 0.5rem;
    letter-spacing: -0.025em;
  }

  .head p {
    font-size: 1.1rem;
    color: var(--text-muted);
    max-width: 48ch;
    margin: 0;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  @media (max-width: 720px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>

<svelte:head>
  <title>Writing — Taylor Milliman</title>
</svelte:head>

<div class="head rise">
  <div class="eyebrow">Writing</div>
  <h1>Essays, notes, and half-baked ideas.</h1>
  <p>Things I'm thinking about — software, food, how to live.</p>
</div>

<div class="grid rise-stagger">
  {#each posts as post}
    <PostItem {post} />
  {/each}
</div>
