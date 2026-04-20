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

  .layout {
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 2rem;
    align-items: start;
  }

  @media (max-width: 860px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }

  .prose p {
    font-size: 1.1rem;
    color: var(--text);
    line-height: 1.7;
  }

  .prose a[href^="http"] {
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

  .prose a[href^="http"]:hover {
    background-size: 100% 100%;
    color: var(--accent-ink);
  }

  .portrait {
    border-radius: var(--radius-xl);
    overflow: hidden;
    border: 1px solid var(--border);
    box-shadow: var(--shadow-md);
    aspect-ratio: 4 / 5;
    position: relative;
  }

  .portrait img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

</style>

<svelte:head>
  <title>About — Taylor Milliman</title>
</svelte:head>

<div class="about-wrap rise">
  <div class="eyebrow">About</div>
  <h1>Hi, I'm Taylor.</h1>

  <div class="layout">
    <div class="prose">
      <p>
        I'm a software engineer, maker, climber, and life enjoyer in San
        Francisco. These days I'm working on
        <a href="https://www.figma.com/" target="_blank" rel="noopener noreferrer">AI at Figma</a>, building tools that help designers and engineers
        collaborate with models.
      </p>
      <p>
        I studied Chemical Engineering formally but fell in love with making things on computers along the way. I wrote about learning to code and becoming a software engineer
        <a
          href="https://medium.com/free-code-camp/how-doing-something-i-love-landed-me-a-top-tier-tech-internship-fe78d8b74e48"
          target="_blank"
          rel="noopener noreferrer">
          along the way.
        </a>

      </p>
      <p>
        Before Figma I worked at Assembled and Thumbtack. Between jobs I
        took a gap year at 17 with no idea what I wanted to do, and another
        one in my twenties to cook, climb, and camp through places I
        hadn't been.
      </p>
    </div>

    <aside>
      <figure class="portrait">
        <img src="mushroom.jpg" alt="Taylor holding mushrooms" />
      </figure>
    </aside>
  </div>
</div>
