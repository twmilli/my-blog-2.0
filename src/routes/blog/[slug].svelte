<script context="module">
  export async function preload({ params, query }) {
    const res = await this.fetch(`blog/${params.slug}.json`);
    const data = await res.json();

    if (res.status === 200) {
      return { post: data };
    } else {
      this.error(res.status, data.message);
    }
  }
</script>

<script>
  import Bio from "../../components/Bio.svelte";
  export let post;
</script>

<style>
  .post-wrap {
    max-width: 42rem;
    margin: 0 auto;
    padding: 2rem 0 1rem;
  }

  .back {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--text-muted);
    font-family: var(--font-sans);
    font-size: 0.9rem;
    text-decoration: none;
    margin-bottom: 1.5rem;
    transition: color var(--dur-2) var(--ease-out-soft);
  }

  .back:hover {
    color: var(--text);
  }

  header {
    text-align: left;
    margin-bottom: 2rem;
  }

  .meta {
    font-family: var(--font-sans);
    font-size: 0.82rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }

  header h1 {
    font-family: var(--font-serif);
    font-size: clamp(2rem, 4vw, 3rem);
    letter-spacing: -0.02em;
    margin: 0;
  }

  .content :global(p),
  .content :global(ul),
  .content :global(ol) {
    font-family: var(--font-serif);
    font-size: 1.15rem;
    line-height: 1.8;
    color: var(--text);
  }

  .content :global(h2),
  .content :global(h3) {
    font-family: var(--font-sans);
    margin-top: 2.2em;
    letter-spacing: -0.015em;
  }

  .content :global(img) {
    border-radius: var(--radius-md);
    margin: 1.5em 0;
    box-shadow: var(--shadow-sm);
  }

  .content :global(blockquote) {
    border-left: 2px solid var(--accent);
    font-family: var(--font-serif);
    font-style: italic;
  }

  .content :global(a) {
    color: var(--text);
    background-image: linear-gradient(var(--accent), var(--accent));
    background-repeat: no-repeat;
    background-size: 100% 1px;
    background-position: 0 100%;
    text-decoration: none;
    transition: background-size var(--dur-3) var(--ease-out-soft);
  }
  .content :global(a:hover) {
    background-size: 100% 6px;
  }

  hr {
    border: 0;
    border-top: 1px solid var(--border);
    margin: 3rem 0 2rem;
  }
</style>

<svelte:head>
  <title>{post.title} — Taylor Milliman</title>
</svelte:head>

<div class="post-wrap rise">
  <a class="back" href="blog">← All writing</a>
  <header>
    <div class="meta">{post.printDate} · {post.printReadingTime}</div>
    <h1>{post.title}</h1>
  </header>
  <article class="content">
    {@html post.html}
  </article>
  <hr />
  <Bio />
</div>
