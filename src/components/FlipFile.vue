<template>
  <div class="flip-file">
    <label class="flip-file__label" :for="id">
      <slot>
        <h2>Add File +</h2>
      </slot>
    </label>
    <input
      class="flip-file__input"
      type="file"
      :id="id"
      :accept="accept"
      @change="handleFileChange"
    />
  </div>
</template>

<script lang="ts" setup>
/* eslint-disable @typescript-eslint/no-unused-vars */
interface Props {
  id: string;
  accept?: string;
  label?: string;
}

withDefaults(defineProps<Props>(), {
  accept: "*/*",
});

const emit = defineEmits<{
  change: [event: Event];
}>();

function handleFileChange(event: Event) {
  emit("change", event);
}
</script>

<style scoped>
.flip-file {
  position: relative;
}

.flip-file__label {
  display: block;
  text-align: center;
  line-height: var(--frame-height);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-heading, #2c3e50);
}

.flip-file__label:hover {
  background-color: var(--main-color-a, rgba(0, 184, 148, 0.1));
}

.flip-file__input {
  position: absolute;
  z-index: -1;
  opacity: 0;
}
</style>
