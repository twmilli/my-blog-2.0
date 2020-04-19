<style>
  #mc-embedded-subscribe {
    margin: auto;
    background-image: repeating-linear-gradient(
      45deg,
      #f0f1f4,
      #f0f1f4 1px,
      white 1px,
      white 6px
    ) !important;
    font-size: 1.2rem;
    text-transform: uppercase;
    text-align: center;
    border-radius: 2px;
    padding: 1rem 1.75rem;
    line-height: 1 !important;
    border-radius: 2px;
    display: block;
    border: 1px solid #92a1b1;
    display: inline-block;
  }

  #mc-embedded-subscribe:hover {
    cursor: pointer;
    color: var(--brand-color-secondary);
    border-color: var(--brand-color-secondary);
  }

  #email-input {
    margin: auto;
    margin-top: 1rem;
    margin-bottom: 1rem;
    padding: 1rem;
    font-size: 1.1rem;
    display: block;
    border-radius: 2px;
    padding-right: 20%;
    border: 1px solid #92a1b1;
    display: inline-block;
  }

  #email-input:focus {
    outline: none;
    box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 640px) {
    #email-input {
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;
      padding: 0.5rem;
      font-size: 0.8rem;
    }

    #mc-embedded-subscribe {
      font-size: 0.8rem;
      padding: 0.5rem 0.9rem;
    }
  }
</style>

<form
  action="https://medium.us15.list-manage.com/subscribe/post?u=5c9abfe8a527c62bb03f94833&amp;id=504169905a"
  method="POST"
  noValidate>
  <input
    type="email"
    name="EMAIL"
    id="email-input"
    placeholder="Email address"
    autoCapitalize="off"
    autoCorrect="off" />
  <input
    type="submit"
    value="Subscribe"
    name="subscribe"
    id="mc-embedded-subscribe"
    class="button" />
</form>
