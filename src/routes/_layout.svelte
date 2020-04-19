<script>
  import { onMount, onDestroy } from "svelte";
  import Header from "../components/Header.svelte";
  import { themeStore } from "../theme.js";

  onMount(renderCSS);
  onDestroy(() => {
    if (typeof document === "undefined") return; // SSR
    var ss = document.getElementById("unique-stylesheet-id");
    ss.innerHTML = ""; // not actually sure if i need this
  });
  let _themeStore; // $ store syntax buggy
  themeStore.subscribe(v => {
    _themeStore = v;
    renderCSS();
  });
  function renderCSS() {
    if (typeof document === "undefined") return; // SSR
    var ss = document.getElementById("unique-stylesheet-id");
    if (!ss) return; // not rendered yet
    let string = ``;
    if ($themeStore.bgColor) string += `--bg-color: ${$themeStore.bgColor};`;
    if ($themeStore.textColor)
      string += `--text-color: ${$themeStore.textColor};`;
    if ($themeStore.linkColor)
      string += `--link-color: ${$themeStore.linkColor};`;
    if ($themeStore.lineLength)
      string += `--line-length: ${$themeStore.lineLength};`;
    ss.innerHTML = `html { ${string} }`;
  }

  export let segment;
</script>

<style>
  .layout {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    min-height: 100vh;
  }

  main {
    flex: 1;
    position: relative;
    margin: 0 auto;
    max-width: 1400px;
    background-color: var(--bg-color);
    padding: 1em 2em;
    box-sizing: border-box;
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  footer {
    color: #aaa;
    font-size: 1em;
    font-family: Rubik, sans-serif;
    margin: 1em auto;
    max-width: 1400px;
    padding: 1em 2em;
    text-align: center;
    width: 100%;
  }
</style>

<svelte:head>
  <title>Taylor Milliman's Website</title>
  <style id="unique-stylesheet-id">

  </style>
  <script>
    (function() {
      let temp = localStorage.getItem("tay_themeStore");
      if (temp) {
        temp = JSON.parse(temp);
        if (typeof document === "undefined") return;
        var ss = document.getElementById("unique-stylesheet-id");
        if (!ss) return;
        let string = ``;
        if (temp.bgColor) string += `--bg-color: ${temp.bgColor};`;
        if (temp.textColor) string += `--text-color: ${temp.textColor};`;
        if (temp.linkColor) string += `--link-color: ${temp.linkColor};`;
        if (temp.lineLength) string += `--line-length: ${temp.lineLength};`;
        ss.innerHTML = `html { ${string} }`;
      }
    })();
  </script>
</svelte:head>

<div class="layout">
  <Header {segment} />

  <main>
    <slot />
  </main>

  <footer>
    <span>&copy; {new Date().getFullYear()}. Made with ❤️ + ☕.</span>
  </footer>
</div>
