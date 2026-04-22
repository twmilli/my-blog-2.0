<script context="module">
  export function preload() {
    return this.fetch(`blog.json`)
      .then((r) => r.json())
      .then((posts) => ({ posts }));
  }
</script>

<script>
  import PostItem from "../components/PostItem.svelte";
  import Skiing from "../components/Skiing.svelte";
  import CurrentLocation from "../components/CurrentLocation.svelte";
  import ListeningStatus from "../components/ListeningStatus.svelte";

  export let posts = [];

  $: featured = posts.slice(0, 4);
</script>

<svelte:head>
  <title>Taylor Milliman</title>
</svelte:head>

<section class="hero rise-stagger">
  <div class="tile tile-photo">
    <img
      src="backgammon.png"
      alt="Taylor playing backgammon at sunset on a camping trip"
    />
    <div class="caption">
      <p>
        Taylor is a software builder, climber, and life-enjoyer based in San
        Francisco.
      </p>
      <div class="caption-meta-block">
        <span class="currently">Currently: AI @ Figma</span>
        <div class="caption-right">
          <ListeningStatus />
          <CurrentLocation />
        </div>
      </div>
    </div>
  </div>

  <Skiing />
</section>

<section>
  <div class="section-head">
    <h2>Writing</h2>
    <a href="blog">All writing →</a>
  </div>

  <div class="grid rise-stagger">
    {#each featured as post}
      <PostItem {post} />
    {/each}
  </div>
</section>

<style>
  .hero {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 1rem;
    margin: 1rem 0 2.5rem;
  }

  @media (max-width: 860px) {
    .hero {
      grid-template-columns: 1fr;
    }
  }

  .tile {
    position: relative;
    border-radius: var(--radius-xl);
    overflow: hidden;
    min-height: 520px;
    box-shadow: var(--shadow-md);
    isolation: isolate;
  }

  .tile-photo {
    background: #111;
  }

  .tile-photo img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 35%;
    transform: scale(1.02);
    transition: transform 1200ms var(--ease-out-soft);
  }

  .tile-photo:hover img {
    transform: scale(1.06);
  }

  .tile-photo::after {
    /* subtle top gradient for caption legibility */
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.35) 0%,
      rgba(0, 0, 0, 0) 60%
    );
    pointer-events: none;
  }

  .caption {
    position: absolute;
    left: 1.25rem;
    right: 1.25rem;
    top: 1.25rem;
    min-height: 190px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.85rem;
    padding: 1.1rem 1.25rem 1rem;
    border-radius: var(--radius-lg);
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid rgba(255, 255, 255, 0.16);
    color: #1a6e7e;
    font-weight: 500;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  }

  .caption p {
    font-family: var(--font-serif);
    font-size: clamp(0.98rem, 1.45vw, 1.22rem);
    line-height: 1.35;
    margin: 0;
    letter-spacing: -0.01em;
    font-weight: 500;
    color: inherit;
  }

  .caption-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    font-family: var(--font-sans);
    font-size: 0.85rem;
    font-weight: 500;
    color: inherit;
  }

  .caption-meta-block {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 1rem 1.25rem;
    font-family: var(--font-sans);
    font-size: 0.85rem;
    font-weight: 500;
    color: inherit;
  }

  .currently {
    color: inherit;
    justify-self: start;
    text-align: left;
  }

  .caption-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-self: end;
    gap: 0.5rem;
    text-align: right;
  }

  @media (max-width: 520px) {
    .caption-meta-block {
      grid-template-columns: 1fr;
    }

    .currently {
      justify-self: start;
    }

    .caption-right {
      justify-self: end;
    }
  }

  /* Section */
  .section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin: 2.5rem 0 1rem;
    gap: 1rem;
  }

  .section-head h2 {
    font-family: var(--font-serif);
    font-size: clamp(1.4rem, 2.2vw, 1.8rem);
    margin: 0;
    letter-spacing: -0.015em;
    font-weight: 600;
  }

  .section-head a {
    font-family: var(--font-sans);
    font-size: 0.95rem;
    color: var(--text-muted);
    text-decoration: none;
  }

  .section-head a:hover {
    color: var(--accent);
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
