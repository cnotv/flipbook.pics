<template>
  <button
    class="flip-button"
    :class="{ 'flip-button--disabled': disabled }"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script lang="ts" setup>
interface Props {
  disabled?: boolean;
}

defineProps<Props>();
defineEmits<{
  click: [];
}>();
</script>

<style lang="scss" scoped>
.flip-button {
  background: var(--main-color, #00b894);
  border: var(--border);
  border-radius: var(--border-radius);
  padding: 0.5em 1em;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  color: var(--color-text-a, #fff);
  transition: all 0.2s ease;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  box-sizing: border-box;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover:not(:disabled) {
    background-color: hsla(var(--main-color-hsl, 160, 100%, 37%), 0.8);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    background-color: hsla(var(--main-color-hsl, 160, 100%, 37%), 0.9);
  }

  &--disabled,
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    background: var(--main-color, #00b894);

    &:hover {
      background: var(--main-color, #00b894);
      transform: none;
      box-shadow: none;
    }
  }
}
</style>
