<script>
  import { onMount, onDestroy } from "svelte";

  /** API origin returning { place?, lat, lng, receivedAt? | timestamp? } */
  export let endpoint = "https://tay-location-api.vercel.app/api/location";
  export let staleAfterHours = 48;
  export let fallback = "\u2014";

  let place = null;
  let lat = null;
  let lng = null;
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
      if (!data) return;
      place = typeof data.place === "string" && data.place ? data.place : null;
      lat = typeof data.lat === "number" ? data.lat : null;
      lng = typeof data.lng === "number" ? data.lng : null;
      receivedAt = data.receivedAt || data.timestamp || null;
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

  $: hasCoords =
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  /** Apple Maps expects `?&ll=` plus a `q` param for reliable deep links. */
  $: mapsUrl = hasCoords
    ? `https://maps.apple.com/?&ll=${lat},${lng}&q=My%20Location`
    : null;

  $: hasPlace = typeof place === "string" && place.length > 0;

  $: mapsAria = hasPlace
    ? `Open ${place} in Apple Maps at shared coordinates`
    : "Open shared coordinates in Apple Maps";

  $: rel = relativeTime(receivedAt);
  $: show =
    hasCoords &&
    mapsUrl &&
    hasPlace &&
    !isStale(receivedAt);
</script>

<style>
  .loc {
    display: inline-flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.28rem;
    max-width: 100%;
    min-width: 0;
    white-space: nowrap;
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    border-radius: 0.2rem;
    vertical-align: bottom;
  }

  .loc:hover {
    opacity: 0.92;
  }

  .loc:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  .loc-icon {
    width: 0.85rem;
    height: 0.85rem;
    flex-shrink: 0;
    color: currentColor;
    align-self: center;
  }

  .loc-icon .fold {
    opacity: 0.35;
  }

  .loc-place {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }

  .loc-rel {
    opacity: 0.72;
    font-weight: 400;
    flex-shrink: 0;
    white-space: nowrap;
  }
</style>

{#if show}
  <a
    class="loc"
    href={mapsUrl}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={mapsAria}
  >
    <svg
      class="loc-icon"
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
    <span class="loc-place">{place}</span>
    {#if rel}<span class="loc-rel">{rel}</span>{/if}
  </a>
{:else}
  <span>{fallback}</span>
{/if}
