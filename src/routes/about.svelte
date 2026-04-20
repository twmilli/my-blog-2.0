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

  .fact-list {
    list-style: none;
    padding: 0;
    margin: 1.5rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-family: var(--font-sans);
    font-size: 0.95rem;
    color: var(--text-muted);
  }

  .fact-list li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.5rem 0;
    border-bottom: 1px dashed var(--border);
    margin: 0;
  }

  .fact-list li span:first-child {
    color: var(--text-faint);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-size: 0.75rem;
  }

  .fact-list li span:last-child {
    color: var(--text);
    font-weight: 500;
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
        I'm a software engineer, maker, and amateur chef living in San
        Francisco. These days I'm working on
        <a href="https://www.figma.com/" target="_blank" rel="noopener noreferrer">AI at Figma</a>
        — building the tools that help designers and engineers
        collaborate with models.
      </p>
      <p>
        I went to Bucknell, where I majored in Chemical Engineering but fell
        hard for computer science along the way. I broke into the industry
        with an internship at Braintree — there's a
        <a
          href="https://medium.com/free-code-camp/how-doing-something-i-love-landed-me-a-top-tier-tech-internship-fe78d8b74e48"
          target="_blank"
          rel="noopener noreferrer">
          long story
        </a>
        about how that happened.
      </p>
      <p>
        Before Figma I worked at Assembled and Thumbtack. Between jobs I
        took a gap year at 17 with no idea what I wanted to do, and another
        one in my twenties to cook, climb, and camp through places I
        hadn't been.
      </p>
      <p>
        I hope to stay curious and make the world a little better along
        the way. If that sounds like fun, say hi — twm013 at bucknell
        dot edu.
      </p>
    </div>

    <aside>
      <figure class="portrait">
        <img src="mushroom.jpg" alt="Taylor holding mushrooms" />
      </figure>
      <ul class="fact-list">
        <li><span>Based in</span><span>San Francisco</span></li>
        <li><span>Currently</span><span>AI @ Figma</span></li>
        <li><span>Previously</span><span>Assembled, Thumbtack</span></li>
        <li><span>School</span><span>Bucknell '17</span></li>
      </ul>
    </aside>
  </div>
</div>
