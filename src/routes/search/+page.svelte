<script>
  import LegacySearchPage from '../search.svelte';

  export let data;
</script>

<LegacySearchPage posts={data.posts} />
