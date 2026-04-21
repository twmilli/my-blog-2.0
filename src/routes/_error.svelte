<script>
  export let status;
  export let error;

  const dev = process.env.NODE_ENV === "development";
  $: message = error?.message || "Something went wrong.";
</script>

<style>
  .wrap {
    max-width: 40rem;
    margin: 4rem auto;
    padding: 2rem;
    text-align: center;
  }

  .badge {
    display: inline-block;
    padding: 0.35rem 0.9rem;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent);
    font-family: var(--font-sans);
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 1.5rem;
    font-weight: 600;
  }

  h1 {
    font-family: var(--font-serif);
    font-size: clamp(3rem, 8vw, 6rem);
    margin: 0 0 0.5rem;
    letter-spacing: -0.03em;
  }

  p {
    color: var(--text-muted);
    font-size: 1.1rem;
    margin: 0.5rem 0 2rem;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 1.2rem;
    border-radius: 999px;
    background: var(--text);
    color: var(--bg);
    font-family: var(--font-sans);
    font-weight: 500;
    text-decoration: none;
    transition: transform var(--dur-2) var(--ease-out-soft);
  }

  a:hover {
    transform: translateY(-1px);
    color: var(--bg);
  }

  pre {
    text-align: left;
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 1rem;
    border-radius: var(--radius-md);
    overflow: auto;
    margin-top: 2rem;
  }
</style>

<svelte:head>
  <title>{status}</title>
</svelte:head>

<div class="wrap rise">
  <span class="badge">Error {status}</span>
  <h1>Well, that's awkward.</h1>
  <p>{message}</p>
  <a href=".">Back home →</a>

  {#if dev && error?.stack}
    <pre>{error.stack}</pre>
  {/if}
</div>
