<script>
  import { onMount, onDestroy } from "svelte";
  import { themeStore } from "../theme.js";

  export let segment;

  let contactOpen = false;
  let contactRef;

  const toggleTheme = () => {
    themeStore.set({
      name: ($themeStore && $themeStore.name) === "dark" ? "light" : "dark",
    });
  };

  const handleClickOutside = (e) => {
    if (!contactOpen) return;
    if (contactRef && !contactRef.contains(e.target)) {
      contactOpen = false;
    }
  };

  const handleKey = (e) => {
    if (e.key === "Escape") contactOpen = false;
  };

  onMount(() => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
  });

  onDestroy(() => {
    if (typeof document === "undefined") return;
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("keydown", handleKey);
  });
</script>

<style>
  nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: 100%;
  }

  .cluster {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .brand {
    font-family: var(--font-sans);
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
    color: var(--text);
    cursor: pointer;
    transition: transform var(--dur-2) var(--ease-out-soft),
      box-shadow var(--dur-2) var(--ease-out-soft),
      border-color var(--dur-2) var(--ease-out-soft);
  }

  .icon-btn:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
    border-color: var(--border-strong);
  }

  .caret {
    width: 8px;
    height: 8px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: rotate(45deg) translate(-2px, -2px);
    transition: transform var(--dur-2) var(--ease-out-soft);
    opacity: 0.6;
    margin-left: 0.15rem;
  }

  .contact-wrap.open .caret {
    transform: rotate(-135deg) translate(-2px, -2px);
  }

  .contact-wrap {
    position: relative;
  }

  .contact-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    min-width: 220px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    padding: 0.35rem;
    display: flex;
    flex-direction: column;
    z-index: 50;
    transform-origin: top right;
    animation: menu-in var(--dur-2) var(--ease-out-soft) both;
  }

  @keyframes menu-in {
    from {
      opacity: 0;
      transform: scale(0.98) translateY(-2px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .contact-menu a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.6rem 0.8rem;
    border-radius: 10px;
    font-family: var(--font-sans);
    font-size: 0.95rem;
    color: var(--text);
    text-decoration: none;
    transition: background var(--dur-1) var(--ease-out-soft);
  }

  .contact-menu a:hover {
    background: var(--surface-2);
    color: var(--text);
  }

  .contact-menu .meta {
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  @media (max-width: 560px) {
    .brand {
      font-size: 0.9rem;
    }
    .cluster {
      gap: 0.35rem;
    }
    .pill {
      padding: 0.45rem 0.8rem;
      font-size: 0.9rem;
    }
  }
</style>

<nav aria-label="Primary">
  <div class="cluster">
    <a class="pill brand" href=".">Taylor M.</a>
  </div>

  <div class="cluster">
    <a
      class="pill"
      aria-current={segment === undefined ? 'page' : undefined}
      href=".">
      Home
    </a>
    <a
      class="pill"
      aria-current={segment === 'blog' ? 'page' : undefined}
      rel="prefetch"
      href="blog">
      Writing
    </a>
    <a
      class="pill"
      aria-current={segment === 'reading' ? 'page' : undefined}
      href="reading">
      Reading
    </a>
    <a
      class="pill"
      aria-current={segment === 'about' ? 'page' : undefined}
      href="about">
      About
    </a>

    <div
      class="contact-wrap"
      class:open={contactOpen}
      bind:this={contactRef}>
      <button
        type="button"
        class="pill"
        aria-haspopup="true"
        aria-expanded={contactOpen}
        on:click={() => (contactOpen = !contactOpen)}>
        Contact
        <span class="caret" aria-hidden="true"></span>
      </button>

      {#if contactOpen}
        <div class="contact-menu" role="menu">
          <a href="mailto:twm013@bucknell.edu" role="menuitem">
            <span>Email</span><span class="meta">→</span>
          </a>
          <a
            href="https://twitter.com/TayTayTrey"
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem">
            <span>Twitter</span><span class="meta">↗</span>
          </a>
          <a
            href="https://github.com/twmilli"
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem">
            <span>GitHub</span><span class="meta">↗</span>
          </a>
          <a
            href="https://taylor.substack.com/"
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem">
            <span>Substack</span><span class="meta">↗</span>
          </a>
        </div>
      {/if}
    </div>

    <button
      type="button"
      class="icon-btn"
      aria-label="Toggle color theme"
      on:click={toggleTheme}>
      {#if $themeStore && $themeStore.name === 'dark'}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>
      {/if}
    </button>
  </div>
</nav>
