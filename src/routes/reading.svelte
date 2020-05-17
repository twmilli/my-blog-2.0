<script>
  import { books } from "../components/Books.svelte";
  import dateFormat from "dateformat";

  const compare = (a, b) => {
    if (a.rating > b.rating) {
      return -1;
    } else if (a.rating < b.rating) {
      return 1;
    }
    return a.date > b.date ? -1 : a.date < b.date ? 1 : 0;
  };

  function toDateString(readDate) {
    return dateFormat(readDate, "mmm, yyyy");
  }

  let { read } = books;
  read = read
    .map(book => {
      const parts = book.date.split("-");
      const d = new Date(parts[1], parts[0] - 1);
      return {
        ...book,
        date: d
      };
    })
    .sort(compare);
</script>

<style>
  .reading-page-container {
    margin: 1rem;
  }
  .read-container {
    margin: 1rem 0;
  }
  li {
    margin: 1rem;
  }

  .goodreads-link {
    display: block;
  }
</style>

<div class="reading-page-container">
  <h1>Reading</h1>
  <a
    class="goodreads-link"
    href="https://www.goodreads.com/review/list/68049286-taylor?shelf=to-read"
    target="_blank"
    rel="noopener noreferrer">
    Goodreads.
  </a>
  <br />
  <div class="read-container">
    <span>Books I have read in recent memory (estimated dates):</span>
    {#each read as book}
      <li class="read-book" key={book.link}>
        <a href={book.link} target="_blank" rel="noopener noreferrer">
          {book.title}
        </a>
        &nbsp; by {book.author} &nbsp; [{book.rating}/10] &nbsp; ({toDateString(book.date)})
      </li>
    {/each}
  </div>
</div>
