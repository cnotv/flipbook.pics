<script lang="ts" setup>
interface Props {
  frames: string[];
  cover?: string | null;
  currentFrameIndex: number;
}

defineProps<Props>();
</script>

<template>
  <div class="frames">
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
        opacity:
          index === currentFrameIndex ? 0 : index < frames.length - 1 ? 0.5 : 1,
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
  transition:
    transform 0.1s cubic-bezier(0.07, 0.94, 0.31, 0.9),
    opacity 0.025s cubic-bezier(0, 1.16, 0.16, 0.98);
}

.frames__item--current {
  z-index: 2 !important;
}
</style>
