<script lang="ts" setup>
interface Props {
  frames: string[];
  cover?: string | null;
  currentFrameIndex: number;
  loadingStatus: number;
  loadingText: string;
  LOADING_STATUS: {
    idle: number;
    loadingVideo: number;
    generatingFrames: number;
    extractingFrames: number;
    ready: number;
  };
}

defineProps<Props>();
</script>

<template>
  <div class="frames">
    <!-- Loading overlay -->
    <div v-if="loadingStatus !== LOADING_STATUS.idle" class="frames__loading-overlay">
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
    <img
      class="frames__item"
      :class="{ 'frames__item--flipped': index < frames.length - 1 }"
      :style="{
        zIndex: -index,
        display: index < frames.length - 10 ? 'none' : 'block',
        opacity: index === currentFrameIndex ? 0 : index < frames.length - 1 ? 0.5 : 1,
      }"
      :src="frame"
      alt=""
      v-for="(frame, index) in frames"
      :key="`stack-${index}`"
    />
  </div>
</template>

<style scoped>
.frames {
  position: relative;
  width: var(--frame-width);
  height: var(--frame-height);
  z-index: 100;
  -webkit-perspective: 1300px;
  perspective: 1300px;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  max-width: 100%;
  overflow: hidden; /* Only the frames container needs overflow hidden */
  border-radius: var(--border-radius);
}

.frames__loading-overlay {
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

.frames__loading-content {
  text-align: center;
  color: white;
  padding: 2rem;
}

.frames__loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  margin: 0 auto 1rem;
}

.frames__loading-text {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.frames__loading-status {
  font-size: 0.9rem;
  opacity: 0.8;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.frames__item {
  position: absolute;
  width: var(--frame-width);
  height: var(--frame-height);
  object-fit: contain; /* Maintain aspect ratio within fixed dimensions */
  object-position: center; /* Center the content */
  /* box-shadow: 1px 1px 1px 1px white; */
  -webkit-transform-style: preserve-3d;
  transform-style: preserve-3d;
  -webkit-transition-property: -webkit-transform;
  transition-property: transform;
  max-width: 100%;
}

.frames__item--flipped {
  transform: rotateY(-75deg);
  transform-origin: left center;
  opacity: 0.5;
  transition: transform 0.1s cubic-bezier(0.07, 0.94, 0.31, 0.9),
    opacity 0.025s cubic-bezier(0, 1.16, 0.16, 0.98);
}

.frames__item--current {
  z-index: 2 !important;
}
</style>
