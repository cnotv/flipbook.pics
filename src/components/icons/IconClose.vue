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
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
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
