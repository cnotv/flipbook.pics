<template>
  <svg
    :width="width"
    :height="height"
    viewBox="0 0 24 24"
    fill="currentColor"
    v-bind="$attrs"
  >
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
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
