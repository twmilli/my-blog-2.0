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
  import PostItem from "../../components/PostItem.svelte";
  export let posts;
</script>

<style>
  hr {
    margin: 40px auto;
  }
</style>

<svelte:head>
  <title>Blog</title>
</svelte:head>

<div class="container">
  {#each posts as post, index}
    {#if index}
      <hr />
    {/if}
    <PostItem {post} />
  {/each}
</div>
