<template>
  <div class="flip-slider">
    <label v-if="label" :for="id" class="flip-slider__label">{{ label }}</label>
    <div class="flip-slider__controls">
      <input
        :id="id"
        v-model="internalValue"
        type="range"
        class="flip-slider__range"
        :min="min"
        :max="max"
        :step="step"
        @input="handleInput"
        @change="handleChange"
      />
      <input
        v-model="internalValue"
        type="number"
        class="flip-slider__number"
        :min="min"
        :max="max"
        :step="step"
        @input="handleInput"
        @change="handleChange"
      />
    </div>
    <div v-if="showInfo" class="flip-slider__info">
      <slot name="info">
        <p>{{ infoText }}</p>
      </slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, watch } from "vue";

interface Props {
  modelValue: string | number;
  label?: string;
  id?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  showInfo?: boolean;
  infoText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  showInfo: false,
  infoText: "",
});

const emit = defineEmits<{
  "update:modelValue": [value: string | number];
  input: [value: string | number];
  change: [value: string | number];
}>();

const internalValue = ref(props.modelValue);

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    internalValue.value = newValue;
  },
);

function handleInput() {
  emit("update:modelValue", internalValue.value);
  emit("input", internalValue.value);
}

function handleChange() {
  emit("update:modelValue", internalValue.value);
  emit("change", internalValue.value);
}
</script>

<style lang="scss" scoped>
.flip-slider {
  display: flex;
  flex-direction: column;
  gap: 0.75em;
  margin-bottom: 1.5em;

  &__label {
    font-weight: 600;
    margin-bottom: 0.25em;
    display: block;
    color: var(--color-heading, #2c3e50);
  }

  &__controls {
    display: flex;
    gap: 1em;
    align-items: center;
  }

  &__range {
    flex: 1;
    height: 8px;
    border-radius: var(--border-radius, 4px);
    background: var(--color-background-mute, #f2f2f2);
    outline: none;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    appearance: none;

    &::-webkit-slider-thumb {
      appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--main-color, #00b894);
      cursor: pointer;
      border: 3px solid var(--color-background, #fff);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      transition: all 0.2s ease;

      &:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        background: var(--main-color, #00b894);
      }

      &:active {
        transform: scale(1.05);
      }
    }

    &::-moz-range-thumb {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--main-color, #00b894);
      cursor: pointer;
      border: 3px solid var(--color-background, #fff);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      transition: all 0.2s ease;

      &:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
    }

    &::-moz-range-track {
      height: 8px;
      background: var(--color-background-mute, #f2f2f2);
      border-radius: var(--border-radius, 4px);
      border: none;
    }
  }

  &__number {
    width: 80px;
    padding: 0.5em;
    border: var(--border, 1px solid #ccc);
    border-radius: var(--border-radius, 4px);
    background: var(--color-background, #fff);
    font-family: inherit;
    font-size: inherit;
    text-align: center;
    transition: all 0.2s ease;
    color: var(--color-text, #2c3e50);

    &:focus {
      outline: none;
      border-color: var(--main-color, #00b894);
      box-shadow: 0 0 0 3px var(--main-color-a, rgba(0, 184, 148, 0.1));
    }

    &:hover {
      border-color: var(--color-border-hover, rgba(60, 60, 60, 0.29));
    }
  }

  &__info {
    font-size: 0.9em;
    opacity: 0.8;
    margin-top: 0.25em;
    color: var(--color-text, #2c3e50);

    p {
      margin: 0.25em 0;
    }
  }
}
</style>
