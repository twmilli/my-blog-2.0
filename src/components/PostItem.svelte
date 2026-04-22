<script>
  export let post;
</script>

<style>
  .post-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1.5rem;
    min-height: 260px;
    border-radius: var(--radius-xl);
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
    color: var(--text);
    text-decoration: none;
    overflow: hidden;
    position: relative;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-family: var(--font-sans);
    font-size: 0.78rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  h3 {
    font-family: var(--font-serif);
    font-size: clamp(1.3rem, 2vw, 1.65rem);
    font-weight: 700;
    letter-spacing: -0.015em;
    margin: 1rem 0 0.5rem;
    color: var(--text);
  }

  .excerpt {
    font-size: 0.98rem;
    color: var(--text-muted);
    line-height: 1.55;
    margin: 0 0 1.5rem;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .read {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-family: var(--font-sans);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--accent);
  }

  .read .arr {
    transition: transform var(--dur-2) var(--ease-out-soft);
  }

  .post-card:hover .read .arr {
    transform: translateX(3px);
  }
</style>

<a class="post-card" rel="prefetch" href="blog/{post.slug}">
  <div>
    <div class="meta">
      <span>{post.printDate}</span>
    </div>
    <h3>{post.title}</h3>
    {#if post.excerpt}
      <p class="excerpt">{post.excerpt}</p>
    {/if}
  </div>
  <span class="read">
    Read essay <span class="arr">→</span>
  </span>
</a>
