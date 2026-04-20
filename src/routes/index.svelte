<script context="module">
  export function preload() {
    return this.fetch(`blog.json`)
      .then((r) => r.json())
      .then((posts) => ({ posts }));
  }
</script>

<script>
  import { onMount, onDestroy } from "svelte";
  import PostItem from "../components/PostItem.svelte";
  import Tetris from "../components/Tetris.svelte";

  export let posts = [];

  let localTime = "";
  let timer;

  const formatTime = () => {
    try {
      const now = new Date();
      const opts = {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Los_Angeles",
      };
      localTime = new Intl.DateTimeFormat("en-US", opts).format(now) + " SF";
    } catch (e) {
      localTime = "";
    }
  };

  onMount(() => {
    formatTime();
    timer = setInterval(formatTime, 30000);
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });

  $: featured = posts.slice(0, 4);
</script>

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
    border: 1px solid var(--border);
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
    /* subtle bottom gradient for legibility */
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0) 40%,
      rgba(0, 0, 0, 0.35) 100%
    );
    pointer-events: none;
  }

  .caption {
    position: absolute;
    left: 1.25rem;
    right: 1.25rem;
    bottom: 1.25rem;
    padding: 1.1rem 1.25rem 1rem;
    border-radius: var(--radius-lg);
    background: rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid rgba(255, 255, 255, 0.22);
    color: #fdfbf6;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  }

  .caption p {
    font-family: var(--font-serif);
    font-size: clamp(1.05rem, 1.6vw, 1.35rem);
    line-height: 1.35;
    margin: 0 0 0.85rem;
    letter-spacing: -0.01em;
    color: #fdfbf6;
  }

  .caption-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    font-family: var(--font-sans);
    font-size: 0.85rem;
    opacity: 0.9;
    color: #fdfbf6;
  }

  .caption-meta .dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #b0e8c2;
    margin-right: 0.45rem;
    vertical-align: middle;
    box-shadow: 0 0 0 3px rgba(176, 232, 194, 0.25);
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

<svelte:head>
  <title>Taylor Milliman — Software engineer working on AI at Figma</title>
</svelte:head>

<section class="hero rise-stagger">
  <a class="tile tile-photo" href="about" aria-label="About Taylor">
    <img src="backgammon.png" alt="Taylor playing backgammon at sunset on a camping trip" />
    <div class="caption">
      <p>
        Taylor is a software engineer and amateur chef
        based in San Francisco.
      </p>
      <div class="caption-meta">
        <span><span class="dot"></span>Working on AI at Figma</span>
        <span>{localTime || "—"}</span>
      </div>
    </div>
  </a>

  <Tetris />
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
