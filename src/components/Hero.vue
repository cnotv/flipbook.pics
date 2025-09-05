<script setup lang="ts">
defineProps<{
  msg: string;
}>();
</script>

<template>
  <div class="hero">
    <h1 class="hero__title green">{{ msg }}</h1>
    <h3 class="hero__subtitle">Create your flipbook from your own videos!</h3>
  </div>
</template>

<style lang="scss" scoped>
.hero {
  text-align: center;

  &__title {
    font-weight: 500;
    font-size: 2.6rem;
    top: -10px;
  }

  &__subtitle {
    font-size: 1.2rem;
  }

  @media (min-width: 1024px) {
    text-align: left;

    &__title,
    &__subtitle {
      text-align: left;
    }
  }
}
</style>
