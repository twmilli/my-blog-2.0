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
    width: 300px;
    height: 300px;
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
    }

    .home-copy {
      flex: 0;
      text-align: center;
    }
  }
</style>

<svelte:head>
  <title>Taylor Milliman's Website</title>
</svelte:head>

<div class="home-container">
  <div class="home-copy">
    <h1>Hi, I'm Taylor.</h1>
    <p>Currently, I'm a software engineer @ Thumbtack.</p>
    <div class="blurb">
      <span>Get my newsletter.</span>
      It features the absolute best of what I read each week, what I'm thinking
      about, and what I'm working on. We go down rabbit holes and tangents in a
      futile attempt to better understand the world.
    </div>
    <EmailNewsletter />
  </div>

  <img alt="Person typing on laptop" src="tay.jpg" />
</div>
