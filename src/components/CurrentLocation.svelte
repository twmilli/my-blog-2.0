<script>
  import { onMount, onDestroy } from "svelte";

  export let endpoint = "https://tay-location-api.vercel.app/api/location";
  export let staleAfterHours = 48;
  export let fallback = "\u2014";

  let label = null;
  let receivedAt = null;
  let now = Date.now();
  let tick;

  function relativeTime(iso) {
    if (!iso) return null;
    const then = Date.parse(iso);
    if (!Number.isFinite(then)) return null;
    const diffMs = Math.max(0, now - then);
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  function isStale(iso) {
    if (!iso) return true;
    const then = Date.parse(iso);
    if (!Number.isFinite(then)) return true;
    return now - then > staleAfterHours * 60 * 60 * 1000;
  }

  async function load() {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.label) {
        label = data.label;
        receivedAt = data.receivedAt || data.timestamp || null;
      }
    } catch (_err) {
      // Fail silently — falls back to the placeholder.
    }
  }

  onMount(() => {
    load();
    tick = setInterval(() => (now = Date.now()), 30000);
  });

  onDestroy(() => {
    if (tick) clearInterval(tick);
  });

  $: rel = relativeTime(receivedAt);
  $: show = label && !isStale(receivedAt);
</script>

<style>
  .loc-meta {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    white-space: nowrap;
  }

  .loc-plane {
    width: 0.85rem;
    height: 0.85rem;
    flex-shrink: 0;
    color: currentColor;
  }

  .loc-plane .fold {
    opacity: 0.35;
  }

  .loc-rel {
    opacity: 0.75;
    font-weight: 400;
  }
</style>

{#if show}
  <span class="loc-meta">
    <svg
      class="loc-plane"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 12 L22 3 L13 22 L10 14 Z" fill="currentColor" />
      <path
        class="fold"
        d="M22 3 L10 14"
        stroke="currentColor"
        stroke-width="1"
        stroke-linecap="round"
        fill="none"
      />
    </svg>
    <span>{label}</span>
    {#if rel}
      <span class="loc-rel">· {rel}</span>
    {/if}
  </span>
{:else}
  <span>{fallback}</span>
{/if}
