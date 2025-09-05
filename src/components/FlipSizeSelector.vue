<template>
  <div class="flip-size-selector">
    <div class="flip-size-selector__header">
      <h3 class="flip-size-selector__title" @click="toggleCollapsed">
        Size: {{ getCurrentSizeName() }}
      </h3>
      <div class="flip-size-selector__controls">
        <button class="flip-size-selector__unit-toggle" @click="toggleUnits">
          {{ useMetric ? "cm" : "in" }}
        </button>
        <button
          class="flip-size-selector__collapse-toggle"
          :class="{
            'flip-size-selector__collapse-toggle--collapsed': isCollapsed,
          }"
          @click="toggleCollapsed"
        >
          {{ isCollapsed ? "+" : "−" }}
        </button>
      </div>
    </div>
    <div
      class="flip-size-selector__content"
      :class="{ 'flip-size-selector__content--collapsed': isCollapsed }"
    >
      <div class="flip-size-selector__options">
        <button
          v-for="size in flipbookSizes"
          :key="size.id"
          class="flip-size-selector__option"
          :class="{
            'flip-size-selector__option--active': selectedSize === size.id,
          }"
          @click="selectSize(size.id)"
        >
          <div class="flip-size-selector__preview">
            <div
              class="flip-size-selector__rect"
              :style="{
                width: getPreviewWidth(size) + 'px',
                height: getPreviewHeight(size) + 'px',
              }"
            ></div>
          </div>
          <div class="flip-size-selector__info">
            <div class="flip-size-selector__name">{{ size.name }}</div>
            <div class="flip-size-selector__dimensions">
              {{ formatDimensions(size) }}
            </div>
            <div class="flip-size-selector__description">
              {{ size.description }}
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

interface FlipbookSize {
  id: string;
  name: string;
  width: number;
  height: number;
  description: string;
}

const selectedSize = ref("classic");
const useMetric = ref(true); // Set metric as default
const isCollapsed = ref(true); // Start collapsed by default

const flipbookSizes: FlipbookSize[] = [
  {
    id: "mini",
    name: "Mini",
    width: 3, // landscape: wider than tall
    height: 2,
    description: "Pocket size",
  },
  {
    id: "small",
    name: "Small",
    width: 4, // landscape
    height: 3,
    description: "Compact",
  },
  {
    id: "postcard",
    name: "Postcard",
    width: 5.5, // landscape postcard
    height: 4,
    description: "Standard postcard",
  },
  {
    id: "classic",
    name: "Classic",
    width: 6, // landscape
    height: 4,
    description: "Most popular",
  },
  {
    id: "medium",
    name: "Medium",
    width: 7, // landscape
    height: 5,
    description: "Great balance",
  },
  {
    id: "large",
    name: "Large",
    width: 8, // landscape
    height: 6,
    description: "Better details",
  },
  {
    id: "professional",
    name: "Professional",
    width: 10, // landscape
    height: 8,
    description: "Presentation",
  },
  {
    id: "widescreen",
    name: "Widescreen",
    width: 8,
    height: 4.5,
    description: "16:9 format",
  },
  {
    id: "square-small",
    name: "Square Small",
    width: 4,
    height: 4,
    description: "Instagram style",
  },
  {
    id: "square-large",
    name: "Square Large",
    width: 6,
    height: 6,
    description: "Social media",
  },
  {
    id: "panoramic",
    name: "Panoramic",
    width: 10,
    height: 4,
    description: "Ultra-wide format",
  },
];

const emit = defineEmits<{
  sizeChange: [size: FlipbookSize];
}>();

// Unit conversion functions
const inchesToCm = (inches: number) => Math.round(inches * 2.54 * 10) / 10;

const toggleUnits = () => {
  useMetric.value = !useMetric.value;
};

const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value;
};

const formatDimensions = (size: FlipbookSize) => {
  if (useMetric.value) {
    return `${inchesToCm(size.width)} × ${inchesToCm(size.height)} cm`;
  }
  return `${size.width}" × ${size.height}"`;
};

const selectSize = (sizeId: string) => {
  selectedSize.value = sizeId;
  const size = flipbookSizes.find((s) => s.id === sizeId);
  if (size) {
    emit("sizeChange", size);
  }
};

// Calculate preview dimensions (scale to fit in 40px max)
const getPreviewWidth = (size: FlipbookSize) => {
  const maxSize = 40;
  const scale = Math.min(maxSize / size.width, maxSize / size.height);
  return Math.round(size.width * scale);
};

const getPreviewHeight = (size: FlipbookSize) => {
  const maxSize = 40;
  const scale = Math.min(maxSize / size.width, maxSize / size.height);
  return Math.round(size.height * scale);
};

const getCurrentSizeName = () => {
  const currentSize = flipbookSizes.find((s) => s.id === selectedSize.value);
  return currentSize ? currentSize.name : "Classic";
};

// Emit initial size
const initialSize = flipbookSizes.find((s) => s.id === selectedSize.value);
if (initialSize) {
  emit("sizeChange", initialSize);
}
</script>

<style lang="scss" scoped>
.flip-size-selector {
  margin: 2rem auto;
  max-width: 560px;
  padding: 1.5rem;
  background: var(--paper-white, #fefefe);
  border: var(--border, 1px solid #ddd);
  border-radius: var(--border-radius, 8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__title {
    color: var(--main-color, #00b894);
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0;
  }

  &__controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__unit-toggle,
  &__collapse-toggle {
    background: var(--paper-white, #fefefe);
    border: 2px solid var(--main-color, #00b894);
    border-radius: 6px;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--main-color, #00b894);
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: var(--main-color, #00b894);
      color: white;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 184, 148, 0.3);
    }
  }

  &__collapse-toggle {
    padding: 0.5rem;
    font-size: 1rem;
    min-width: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__unit-toggle {
    min-width: 3rem;
  }

  &__content {
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    max-height: 2000px;
    margin-top: 1.5rem;
    opacity: 1;

    &--collapsed {
      max-height: 0;
      opacity: 0;
      margin-top: 0;
      padding-top: 0;
    }
  }

  &__options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  &__option {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: white;
    border: 2px solid #f0f0f0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: inherit;
    text-align: left;

    &:hover {
      border-color: var(--main-color, #00b894);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 184, 148, 0.2);
    }

    &--active {
      border-color: var(--main-color, #00b894);
      background: rgba(0, 184, 148, 0.05);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 184, 148, 0.15);
    }
  }

  &__preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    background: #f8f9fa;
    border-radius: 4px;
    flex-shrink: 0;
  }

  &__rect {
    background: var(--main-color, #00b894);
    border-radius: 2px;
    opacity: 0.8;
    border: 1px solid rgba(0, 184, 148, 0.3);
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
    font-size: 0.95rem;
  }

  &__dimensions {
    font-size: 0.85rem;
    color: var(--main-color, #00b894);
    font-weight: 500;
    margin-bottom: 0.125rem;
  }

  &__description {
    font-size: 0.8rem;
    color: #666;
    opacity: 0.8;
  }

  @media (max-width: 768px) {
    margin: 1rem;
    padding: 1rem;

    &__options {
      grid-template-columns: 1fr;
    }
  }
}
</style>
