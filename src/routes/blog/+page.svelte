<script>
  import LegacyBlogIndexPage from './index.svelte';

  export let data;
</script>

<LegacyBlogIndexPage posts={data.posts} />
