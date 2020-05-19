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
  import Fuse from "fuse.js";
  import PostItem from "../components/PostItem.svelte";

  export let posts;

  let options = {
    keys: ["title", "slug", "tag", "printDate", "excerpt"]
  };
  let fuse = new Fuse(posts, options);
  let results = [];
  const handleSearch = e => {
    e.preventDefault();
    const searchText = e.currentTarget.searchField.value;
    results = fuse.search(searchText).map(p => p.item);
  };
  console.log(results);
</script>

<style>
  .search-term {
    width: 50%;
    font-size: 14px;
    border: none;
    padding: 10px 15px;
    height: 40px;
    border-radius: 20px 0 0 20px;
    outline: none;
    color: var(--bg-color);
    background-color: var(--text-color);
  }

  .search-button {
    width: 40px;
    height: 40px;
    border: 1px solid var(--brand-color-primary);
    background: var(--brand-color-primary);
    text-align: center;
    color: #fff;
    border-radius: 0 5px 5px 0;
    cursor: pointer;
    font-size: 20px;
  }

  .search {
    width: 100%;
    position: relative;
    display: flex;
    justify-content: center;
    padding: 30px 10px;
    font-size: 14px;
  }
</style>

<svelte:head>
  <title>Search</title>
</svelte:head>

<div class="container">
  <form class="search" on:submit={handleSearch}>
    <input
      type="text"
      class="search-term"
      placeholder="search"
      name="searchField" />
    <button type="submit" class="search-button">🔎</button>
  </form>
  {#each results as post, index}
    {#if index}
      <hr />
    {/if}
    <PostItem {post} />
  {/each}
</div>
