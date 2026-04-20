<script>
  import { books } from "../components/Books.svelte";
  import dateFormat from "dateformat";

  const compare = (a, b) => {
    if (a.rating > b.rating) return -1;
    if (a.rating < b.rating) return 1;
    return a.date > b.date ? -1 : a.date < b.date ? 1 : 0;
  };

  const toDateString = (d) => dateFormat(d, "mmm yyyy");

  let { read } = books;
  read = read
    .map((book) => {
      const parts = book.date.split("-");
      const d = new Date(parts[1], parts[0] - 1);
      return { ...book, date: d };
    })
    .sort(compare);
</script>

<style>
  .wrap {
    max-width: 56rem;
    margin: 0 auto;
    padding: 2rem 0;
  }

  .eyebrow {
    font-family: var(--font-sans);
    font-size: 0.8rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
  }

  h1 {
    font-family: var(--font-serif);
    font-size: clamp(2.4rem, 4vw, 3.4rem);
    margin: 0 0 1rem;
    letter-spacing: -0.025em;
  }

  .sub {
    color: var(--text-muted);
    margin: 0 0 2rem;
    font-size: 1.05rem;
    max-width: 52ch;
  }

  .sub a[href^="http"] {
    color: var(--text);
    background-image: linear-gradient(var(--accent), var(--accent));
    background-repeat: no-repeat;
    background-size: 100% 1px;
    background-position: 0 100%;
    padding: 0.12em 0.05em 0.04em;
    margin: 0 -0.05em;
    border-radius: 2px;
    text-decoration: none;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
    transition: background-size var(--dur-3) var(--ease-out-soft),
      color var(--dur-2) var(--ease-out-soft);
  }

  .sub a[href^="http"]:hover {
    background-size: 100% 100%;
    color: var(--accent-ink);
  }

  .list {
    list-style: none;
    padding: 0;
    margin: 2rem 0 0;
    border-top: 1px solid var(--border);
  }

  .item {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 1.25rem;
    padding: 1rem 0.25rem;
    border-bottom: 1px solid var(--border);
    margin: 0;
    align-items: baseline;
    font-family: var(--font-sans);
    transition: background var(--dur-2) var(--ease-out-soft);
  }

  .item:hover {
    background: var(--surface-2);
  }

  .title {
    font-size: 1.05rem;
    color: var(--text);
    line-height: 1.35;
  }

  .title a {
    color: var(--text);
    text-decoration: none;
    background-image: linear-gradient(var(--accent), var(--accent));
    background-repeat: no-repeat;
    background-size: 100% 1px;
    background-position: 0 100%;
    padding: 0.12em 0.05em 0.04em;
    margin: 0 -0.05em;
    border-radius: 2px;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
    transition: background-size var(--dur-3) var(--ease-out-soft),
      color var(--dur-2) var(--ease-out-soft);
  }

  .title a:hover {
    background-size: 100% 100%;
    color: var(--accent-ink);
  }

  .author {
    display: block;
    color: var(--text-muted);
    font-size: 0.85rem;
    margin-top: 0.15rem;
  }

  .when {
    color: var(--text-faint);
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }

  .rating {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.4rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }

  .rating.hi {
    background: var(--accent-soft);
    border-color: transparent;
    color: var(--accent);
    font-weight: 600;
  }

  @media (max-width: 560px) {
    .item {
      grid-template-columns: 1fr auto;
    }
    .when {
      grid-column: 1 / 2;
      margin-top: 0.25rem;
    }
  }
</style>

<svelte:head>
  <title>Reading — Taylor Milliman</title>
</svelte:head>

<div class="wrap rise">
  <div class="eyebrow">Reading</div>
  <h1>Books that made me think.</h1>
  <p class="sub">
    A running list, sorted by how much I liked them. See the full shelf on
    <a href="https://www.goodreads.com/review/list/68049286-taylor?shelf=to-read" target="_blank" rel="noopener noreferrer">Goodreads</a>.
  </p>

  <ul class="list">
    {#each read as book}
      <li class="item">
        <div class="title">
          <a href={book.link} target="_blank" rel="noopener noreferrer">
            {book.title}
          </a>
          <span class="author">{book.author}</span>
        </div>
        <span class="when">{toDateString(book.date)}</span>
        <span class="rating" class:hi={book.rating >= 9}>{book.rating}/10</span>
      </li>
    {/each}
  </ul>
</div>
