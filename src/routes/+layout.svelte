<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { dev } from '$app/environment';
  import LegacyLayout from './_layout.svelte';

  $: segments = $page.url.pathname.split('/').filter(Boolean);
  $: segment = segments[0];

  onMount(() => {
    if (!dev && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js');
    }
  });
</script>

<LegacyLayout {segment}>
  <slot />
</LegacyLayout>
