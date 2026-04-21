<script>
  import LegacyBlogPostPage from '../[slug].svelte';

  export let data;
</script>

<LegacyBlogPostPage post={data.post} />
