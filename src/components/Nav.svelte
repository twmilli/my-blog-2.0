<script>
  import { themeStore } from "../theme.js";

  let toggleTheme = e => {
    const presetThemes = {
      light: {
        name: "light",
        bgColor: "#eeeeee",
        textColor: "#323179",
        linkColor: "#3a90ef",
        lineLength: "69ch"
      },
      default: {
        name: "default",
        bgColor: "#1d1f21",
        textColor: "#eeeeee",
        linkColor: "#2cb67d",
        lineLength: "69ch"
      }
    };
    if ($themeStore.name === "light") {
      $themeStore = presetThemes["default"];
    } else {
      $themeStore = presetThemes["light"];
    }
  };
  export let segment;
</script>

<style>
  nav {
    display: flex;
    flex: 1;
    font-family: Rubik, sans-serif;
    font-weight: 700;
    justify-content: flex-end;
    text-transform: uppercase;
  }

  img:hover {
    cursor: pointer;
  }

  .links {
    align-items: flex-end;
    justify-content: flex-end;
    display: flex;
    flex: 1;
  }

  a {
    color: inherit;
    text-decoration: none;
    padding: 10px 5px;
    display: block;
    position: relative;
    margin-left: 20px;
  }

  a:not(.selected) {
    opacity: 0.7;
  }

  a::before {
    content: "";
    position: absolute;
    transition: transform 0.3s ease;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 2px;
    background: #aaa;
    transform: scaleX(0);
  }

  a:hover::before,
  .selected::before {
    transform: scaleX(1);
  }

  .selected::before {
    background: #fd6378;
  }
</style>

<nav>
  <div>
    <img
      src={$themeStore.name === 'default' ? 'sun.svg' : 'moon.svg'}
      alt="dark mode toggle"
      on:click={toggleTheme} />
  </div>
  <div class="links">
    <a class={segment === undefined ? 'selected' : ''} href=".">home</a>
    <a class={segment === 'about' ? 'selected' : ''} href="about">about</a>
    <a rel="prefetch" class={segment === 'blog' ? 'selected' : ''} href="blog">
      blog
    </a>
  </div>
</nav>
