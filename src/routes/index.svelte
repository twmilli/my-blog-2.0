<script>
  import EmailNewsletter from "../components/EmailNewsletter.svelte";
</script>

<style>
  .home-container {
    display: flex;
    flex: 1;
    justify-content: center;
    margin: 2em 0;
    min-height: 400px;
  }

  .home-copy {
    flex: 1;
    margin-right: 5em;
  }

  h1 {
    font-weight: 700;
    margin-bottom: 0.5em;
  }

  p {
    font-size: 1.4em;
    line-height: 1.5;
  }

  img {
    margin-top: 3em;
    max-width: 300px;
    max-height: 300px;
    border-radius: 50%;
  }

  .blurb {
    font-size: 30px;
  }

  @media (max-width: 1020px) {
    p {
      font-size: 1.2em;
    }

    img {
      max-width: 300px;
    }
  }

  @media (max-width: 800px) {
    .home-container {
      flex-direction: column;
      padding-bottom: 2em;
      align-items: center;
    }

    .home-copy {
      flex: 0;
      text-align: center;
      margin-right: 0;
    }
  }
</style>

<div class="home-container">
  <div class="home-copy">
    <h1>Hi, I'm Taylor.</h1>
    <p>
      Currently, I'm a software engineer @
      <a href="https://www.assembled.com/" target="_blank">Assembled</a>
    </p>
    <p class="blurb">
      <a href="https://taylor.substack.com/">Get my newsletter.</a>
      It features the absolute best of what I read each week, what I'm thinking
      about, and what I'm working on.
      <EmailNewsletter />
    </p>
    <blockquote>
      "Taylor's newsletter is so good, I would read it even if I wasn't
      obligated to."
    </blockquote>
    <p>- My mom</p>
  </div>

  <div>
    <img alt="Person typing on laptop" src="tay.jpg" />
  </div>
</div>
