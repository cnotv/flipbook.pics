<template>
  <div class="app">
    <header class="app__header">
      <a
        href="https://github.com/cnotv/flipbook.pics"
        target="_blank"
        rel="noopener noreferrer"
        class="app__github-link"
        title="View on GitHub"
      >
        <svg
          class="app__github-icon"
          width="20"
          height="20"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
          />
        </svg>
      </a>
    </header>

    <main class="app__main">
      <RouterView />
    </main>
  </div>
</template>

<style lang="scss">
@use "@/assets/base.scss";

.app {
  width: 100vw;
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  font-weight: normal;

  &__header {
    line-height: 1.5;
    max-height: 100vh;
    position: absolute;
  }

  &__github-link {
    position: absolute;
    top: 1rem;
    right: 1rem;
    color: #000000;
    text-decoration: none;
    padding: 0.5rem;
    border-radius: 8px;
    transition: all 0.2s ease;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;

    &:hover {
      background: rgba(255, 255, 255, 0.95);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      color: #000000;

      .app__github-icon {
        transform: scale(1.1);
      }
    }
  }

  &__github-icon {
    transition: transform 0.2s ease;
  }

  @media (max-width: 1024px) {
    &__header {
      width: 100%;
      top: 0;
    }

    &__github-link {
      top: 0.5rem;
      right: 0.5rem;
      width: 36px;
      height: 36px;
    }

    &__github-icon {
      width: 18px;
      height: 18px;
    }

    .logo {
      width: 100%;
      margin: auto;
      font-size: 4em;
      text-align: center;
    }
  }

  @media (min-width: 1024px) {
    &__github-link {
      position: fixed;
      top: 1rem;
      right: 1rem;
    }

    nav {
      text-align: left;
      margin-left: -1rem;
      font-size: 1rem;
      padding: 1rem 0;
      margin-top: 1rem;
    }
  }
}

// Global styles
a,
.green {
  text-decoration: none;
  color: var(--main-color);
  transition: 0.4s;
}

@media (hover: hover) {
  a:hover {
    background-color: hsla(160, 100%, 37%, 0.2);
  }
}

// Navigation styles
.nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;

  &__link {
    display: inline-block;
    padding: 0 1rem;
    border-left: 1px solid var(--color-border);

    &:first-of-type {
      border: 0;
    }

    &--active {
      color: var(--color-text);

      &:hover {
        background-color: transparent;
      }
    }
  }
}

// Legacy nav support
nav {
  @extend .nav;

  a {
    @extend .nav__link;

    &.router-link-exact-active {
      @extend .nav__link--active;
    }
  }
}
</style>
