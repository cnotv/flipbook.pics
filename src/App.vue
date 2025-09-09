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
        <IconGithub class="app__github-icon" />
      </a>
    </header>

    <main class="app__main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import IconGithub from "@/components/icons/IconGithub.vue";
</script>

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
