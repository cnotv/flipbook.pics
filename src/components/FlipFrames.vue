<script lang="ts" setup>
interface Props {
  frames: string[];
  cover?: string | null;
  currentFrameIndex: number;
  loadingStatus: number; // 0=empty, 1=loading, 2=loaded, 3=error
  loadingText: string;
}

defineProps<Props>();
</script>

<template>
  <div class="frames">
    <!-- Paper stack effect -->
    <div class="frames__stack">
      <div
        v-for="i in 6"
        :key="i"
        class="frames__stack-layer"
        :style="{ '--stack-index': i }"
      ></div>
    </div>

    <!-- Loading overlay -->
    <div v-if="loadingStatus === 1" class="frames__loading-overlay">
      <div class="frames__loading-content">
        <div class="frames__loading-spinner"></div>
        <div class="frames__loading-text">{{ loadingText }}</div>
      </div>
    </div>

    <!-- Show cover as the topmost frame if it exists -->
    <img
      v-if="cover"
      class="frames__item"
      :style="{
        zIndex: 1,
        display: 'block',
      }"
      :src="cover"
      alt="Cover"
    />

    <!-- Show current frame when navigating manually -->
    <img
      v-if="frames.length > 0"
      class="frames__item frames__item--current"
      :src="frames[currentFrameIndex]"
      alt="Current frame"
    />

    <!-- Show stack effect for remaining frames -->
    <!-- <img
      class="frames__item"
      :class="{ 'frames__item--flipped': index < frames.length - 1 }"
      :src="frame"
      alt=""
      v-for="(frame, index) in frames"
      :key="`stack-${index}`"
    /> -->
  </div>
</template>

<style lang="scss" scoped>
.frames {
  position: relative;
  width: var(--frame-width);
  height: var(--frame-height);
  z-index: 100;
  perspective: 1300px;
  backface-visibility: hidden;
  max-width: 100%;
  overflow: visible; /* Allow stack effect to be visible */
  border-radius: var(--border-radius);

  /* Paper stack effect */
  &__stack {
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: -1;
  }

  &__stack-layer {
    position: absolute;
    width: 100%;
    height: 100%;
    background: var(--color-background-soft, #f8f9fa);
    border: 1px solid var(--color-border, #e0e0e0);
    border-radius: var(--border-radius);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    transform: translateX(calc(var(--stack-index) * 2px))
      translateY(calc(var(--stack-index) * 2px)) rotate(calc(var(--stack-index) * 0.2deg));
    z-index: calc(-1 * var(--stack-index));
    background: hsl(0, 0%, calc(98% - var(--stack-index) * 1%));
  }

  &__loading {
    &-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      border-radius: var(--border-radius);
    }

    &-content {
      text-align: center;
      color: white;
      padding: 2rem;
    }

    &-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
      margin: 0 auto 1rem;
    }

    &-text {
      font-size: 1.1rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    &-status {
      font-size: 0.9rem;
      opacity: 0.8;
    }
  }

  &__item {
    position: absolute;
    width: var(--frame-width);
    height: var(--frame-height);
    object-fit: contain; /* Maintain aspect ratio within fixed dimensions */
    object-position: center; /* Center the content */
    transform-style: preserve-3d;
    transition-property: transform;
    max-width: 100%;
    border-radius: var(--border-radius);

    &--flipped {
      transform: rotateY(-75deg);
      transform-origin: left center;
      opacity: 0.5;
      z-index: 3;
      transition: transform 0.1s cubic-bezier(0.07, 0.94, 0.31, 0.9),
        opacity 0.025s cubic-bezier(0, 1.16, 0.16, 0.98);
      display: none;
    }

    &--current {
      z-index: 2;
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
