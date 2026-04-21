<script>
</script>

<style>
  .about-wrap {
    max-width: 56rem;
    margin: 0 auto;
    padding: 2rem 0;
  }

  .eyebrow {
    font-family: var(--font-sans);
    font-size: 0.8rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
  }

  h1 {
    font-family: var(--font-serif);
    font-size: clamp(2.4rem, 4vw, 3.4rem);
    margin: 0 0 2rem;
    letter-spacing: -0.025em;
    max-width: 18ch;
  }

  .prose::after {
    content: "";
    display: block;
    clear: both;
  }

  .prose p {
    font-size: 1.1rem;
    color: var(--text);
    line-height: 1.7;
  }

  .prose a {
    color: var(--text);
    background-image: linear-gradient(var(--accent), var(--accent));
    background-repeat: no-repeat;
    background-size: 100% 1px;
    background-position: 0 100%;
    padding: 0.12em 0.05em 0.04em;
    margin: 0 -0.05em;
    border-radius: 2px;
    text-decoration: none;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
    transition: background-size var(--dur-3) var(--ease-out-soft),
      color var(--dur-2) var(--ease-out-soft);
  }

  .prose a:hover {
    background-size: 100% 100%;
    color: var(--accent-ink);
  }

  .photo {
    border-radius: var(--radius-xl);
    overflow: hidden;
    border: 1px solid var(--border);
    box-shadow: var(--shadow-md);
    aspect-ratio: 4 / 5;
    width: 20rem;
    max-width: 50%;
    margin: 0.4rem 0 1.75rem;
    transition: transform var(--dur-3) var(--ease-out-soft);
  }

  .photo--right {
    float: right;
    clear: both;
    margin-left: 2rem;
  }

  .photo--left {
    float: left;
    clear: both;
    margin-right: 2rem;
  }

  .photo:hover {
    transform: scale(1.03);
  }

  .photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  @media (max-width: 720px) {
    .photo,
    .photo--right,
    .photo--left {
      float: none;
      width: 100%;
      max-width: 100%;
      margin: 1.5rem 0;
    }
  }

</style>

<svelte:head>
  <title>About — Taylor Milliman</title>
</svelte:head>

<div class="about-wrap rise">
  <div class="eyebrow">About</div>
  <h1>Hi, I'm Taylor.</h1>

  <div class="prose">
    <figure class="photo photo--right">
      <img src="about-climbing.png" alt="Taylor bouldering with a dog on the crash pad" />
    </figure>
    <p>
      I'm a software engineer, maker, climber, backgammon enthusiast, and life enjoyer in San
      Francisco.
    </p>
    <p>
      These days I'm working on
      <a href="https://www.figma.com/" target="_blank" rel="noopener noreferrer">AI at Figma</a>, building tools that help designers and engineers
      collaborate with models.
    </p>
    <p>
      In the past, I've written about <a
        href="https://medium.com/free-code-camp/how-doing-something-i-love-landed-me-a-top-tier-tech-internship-fe78d8b74e48"
        target="_blank"
        rel="noopener noreferrer">breaking into tech</a>, <a
        href="https://medium.com/free-code-camp/how-doing-something-i-love-landed-me-a-top-tier-tech-internship-fe78d8b74e48"
        target="_blank"
        rel="noopener noreferrer">making a smitten kitchen mobile app</a>, and <a href="blog/2-months-without-a-phone">giving up my phone</a>.
    </p>
    <figure class="photo photo--left">
      <img src="about-ojai.png" alt="Taylor with a cocktail in an Adirondack chair in Ojai" />
    </figure>
    <p>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
      tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
      quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
      consequat.
    </p>
    <p>
      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
      dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
      proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
    </p>
    <figure class="photo photo--right">
      <img src="about-cabin.png" alt="Taylor reflected in a cabin window over rolling hills" />
    </figure>
    <p>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
      tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
      quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
      consequat.
    </p>
    <p>
      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
      dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
      proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
    </p>
  </div>
</div>
