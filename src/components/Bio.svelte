<style>
  .bio {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    border-radius: var(--radius-lg);
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
  }

  .avatar {
    width: 64px;
    height: 64px;
    border-radius: 999px;
    object-fit: cover;
    flex-shrink: 0;
    border: 1px solid var(--border);
  }

  p {
    font-family: var(--font-sans);
    font-size: 0.98rem;
    line-height: 1.55;
    margin: 0;
    color: var(--text);
  }

  p a {
    color: var(--text);
    border-bottom: 1px solid var(--accent);
    transition: background var(--dur-2) var(--ease-out-soft);
  }

  p a:hover {
    background: var(--accent-soft);
  }
</style>

<div class="bio">
  <img class="avatar" src="tay.jpg" alt="Portrait of Taylor" />
  <p>
    Written by
    <strong>Taylor</strong>
    — software engineer working on AI at Figma. Living in San Francisco.
    Follow along on
    <a href="https://twitter.com/TayTayTrey" target="_blank" rel="noopener noreferrer">Twitter</a>,
    <a href="https://github.com/twmilli" target="_blank" rel="noopener noreferrer">GitHub</a>,
    or
    <a href="https://taylor.substack.com/" target="_blank" rel="noopener noreferrer">Substack</a>.
  </p>
</div>
