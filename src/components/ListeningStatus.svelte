<script>
  import { onMount, onDestroy } from "svelte";

  export let endpoint = "https://tay-location-api.vercel.app/api/spotify";
  export let refreshEveryMs = 60000;

  let item = null;
  let refresh;

  async function load() {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) {
        item = null;
        return;
      }
      const data = await res.json();
      if (
        data &&
        (data.state === "playing" || data.state === "recent") &&
        data.track
      ) {
        item = data;
      } else {
        item = null;
      }
    } catch (_err) {
      item = null;
    }
  }

  onMount(() => {
    load();
    refresh = setInterval(load, refreshEveryMs);
  });

  onDestroy(() => {
    if (refresh) clearInterval(refresh);
  });

  $: show = item && (item.state === "playing" || item.state === "recent");
  $: isPlaying = item?.state === "playing";
</script>

{#if show}
  <a
    class="riff"
    class:is-playing={isPlaying}
    class:is-recent={!isPlaying}
    href={item.spotifyUrl}
    target="_blank"
    rel="noreferrer"
    title={`${item.track}${item.artist ? ` - ${item.artist}` : ""}`}
  >
    <span class="bars" aria-hidden="true">
      <span></span><span></span><span></span><span></span>
    </span>
    <span class="track">
      <span class="title">{item.track}</span>
      {#if item.artist}<span class="artist"> — {item.artist}</span>{/if}
    </span>
  </a>
{/if}

<style>
  .riff {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    width: fit-content;
    max-width: 100%;
    align-self: flex-end;
    margin-left: auto;
    color: inherit;
    text-decoration: none;
    font-family: var(--font-sans);
    font-size: 0.85rem;
    font-weight: 500;
    transition: transform var(--dur-2) var(--ease-out-soft),
      opacity var(--dur-2) var(--ease-out-soft);
  }
  .riff:hover {
    transform: translateY(-1px);
    opacity: 0.92;
  }

  .bars {
    display: inline-flex;
    align-items: flex-end;
    gap: 2px;
    height: 1em;
    flex: none;
  }
  .bars span {
    display: inline-block;
    width: 2px;
    background: currentColor;
    border-radius: 2px;
  }

  .track {
    line-height: 1.2;
    min-width: 0;
  }
  .title { font-weight: 500; }
  .artist { opacity: 0.72; font-weight: 400; }

  /* Playing — brisk equalizer */
  .is-playing .bars span {
    animation: riff-eq 900ms ease-in-out infinite;
    height: 35%;
  }
  .is-playing .bars span:nth-child(1) { animation-delay:   0ms; }
  .is-playing .bars span:nth-child(2) { animation-delay: 150ms; }
  .is-playing .bars span:nth-child(3) { animation-delay: 320ms; }
  .is-playing .bars span:nth-child(4) { animation-delay:  80ms; }

  /* Recent — ghosted, static */
  .is-recent { opacity: 0.6; }
  .is-recent .bars span:nth-child(1) { height: 45%; }
  .is-recent .bars span:nth-child(2) { height: 75%; }
  .is-recent .bars span:nth-child(3) { height: 55%; }
  .is-recent .bars span:nth-child(4) { height: 85%; }

  @keyframes riff-eq {
    0%, 100% { height: 25%; }
    50%      { height: 95%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .is-playing .bars span {
      animation: none;
      height: 60%;
    }
  }
</style>
