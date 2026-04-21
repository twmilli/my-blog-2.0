<script>
  import LegacyHomePage from './index.svelte';

  export let data;
</script>

<LegacyHomePage posts={data.posts} />
