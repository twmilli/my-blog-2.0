<script context="module">
  export function preload({ params, query }) {
    return this.fetch(`blog.json`)
      .then(r => r.json())
      .then(posts => {
        return { posts };
      });
  }
</script>

<script>
  export let posts;
</script>

<style>
  h2,
  .post-item-date {
    font-family: Rubik, sans-serif;
    font-weight: 700;
    color: #aaa;
    text-align: left;
    text-transform: uppercase;
    margin: 1rem 0;
  }

  h2 {
    font-size: 36px;
  }

  hr {
    margin: 40px auto;
  }

  .read-more-container {
    display: inline-block;
  }

  .read-more-link {
    font-size: 18px;
    height: 30px;
    position: relative;
    text-decoration: none;
    color: var(--brand-color-primary);
  }

  .read-arrow {
    position: absolute;
    bottom: -2.25px;
    left: 100px;
  }

  .read-more-span {
    margin-top: 8px;
    display: block;
    border-bottom: 2px solid var(--brand-color-primary);
    width: 0%;
  }

  .read-more-container:hover .read-more-span {
    animation: underline 500ms ease-in-out;
    width: 120px;
  }

  p {
    font-size: 16px;
  }

  @keyframes underline {
    from {
      width: 0%;
    }
    to {
      width: 120px;
    }
  }
</style>

<svelte:head>
  <title>Blog</title>
</svelte:head>

<div class="container">
  {#each posts as post, index}
    {#if index}
      <hr />
    {/if}
    <div class="post-item">
      <h2>{post.title}</h2>
      <span class="post-item-date">{post.printDate}</span>
      <p>{post.excerpt}</p>
      <div class="read-more-container">
        <a rel="prefetch" href="blog/{post.slug}" class="read-more-link">
          Read more
          <img src="./arrow-right.svg" alt="arrow right" class="read-arrow" />
        </a>
        <span class="read-more-span" />
      </div>
    </div>
  {/each}
</div>
