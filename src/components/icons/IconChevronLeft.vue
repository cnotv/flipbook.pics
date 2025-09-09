<template>
  <svg
    :width="width"
    :height="height"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    v-bind="$attrs"
  >
    <polyline points="15,18 9,12 15,6"></polyline>
  </svg>
</template>

<script setup lang="ts">
interface Props {
  width?: string | number;
  height?: string | number;
}

withDefaults(defineProps<Props>(), {
  width: 20,
  height: 20,
});
</script>
