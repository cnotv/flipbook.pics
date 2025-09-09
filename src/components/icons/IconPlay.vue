<template>
  <svg
    :width="width"
    :height="height"
    viewBox="0 0 24 24"
    fill="currentColor"
    v-bind="$attrs"
  >
    <polygon points="5,3 19,12 5,21"></polygon>
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
