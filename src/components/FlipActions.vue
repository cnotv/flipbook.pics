<script lang="ts" setup>
import { ref } from "vue";
import FlipButton from "./FlipButton.vue";

interface Props {
  frames: string[];
  isPlaying: boolean;
  currentFrameIndex: number;
  currentTime: string;
  totalTime: string;
  cover?: string | null;
}

interface Emits {
  (e: "reset"): void;
  (e: "togglePlay"): void;
  (e: "print"): void;
  (e: "previousFrame"): void;
  (e: "nextFrame"): void;
  (e: "coverUpload", event: Event): void;
  (e: "removeCover"): void;
}

defineProps<Props>();
defineEmits<Emits>();

// Template ref for the hidden file input
const coverInput = ref<HTMLInputElement>();

// Method to trigger the hidden file input
const triggerCoverUpload = () => {
  coverInput.value?.click();
};
</script>

<template>
  <div class="actions">
    <FlipButton @click="$emit('reset')">X</FlipButton>
    <FlipButton :disabled="frames.length === 0" @click="$emit('togglePlay')">
      {{ isPlaying ? "⏸" : "▶" }}
    </FlipButton>
    <FlipButton :disabled="frames.length === 0" @click="$emit('print')">
      Print
    </FlipButton>

    <!-- Frame navigation -->
    <div class="frame-navigation" v-if="frames.length > 0">
      <FlipButton
        :disabled="currentFrameIndex === 0"
        @click="$emit('previousFrame')"
      >
        ←
      </FlipButton>
      <div class="frame-counter">
        <div class="frame-count">
          {{ currentFrameIndex + 1 }} / {{ frames.length }}
        </div>
        <div class="time-display">{{ currentTime }} / {{ totalTime }}</div>
      </div>
      <FlipButton
        :disabled="currentFrameIndex >= frames.length - 1"
        @click="$emit('nextFrame')"
      >
        →
      </FlipButton>
    </div>

    <!-- Cover upload/remove -->
    <template v-if="!cover">
      <FlipButton @click="triggerCoverUpload" class="cover-upload">
        + Cover
      </FlipButton>
      <input
        type="file"
        id="cover"
        accept="image/*"
        @change="$emit('coverUpload', $event)"
        style="display: none"
        ref="coverInput"
      />
    </template>
    <FlipButton v-else @click="$emit('removeCover')"> - Cover </FlipButton>
  </div>
</template>

<style scoped>
.actions {
  display: flex;
  flex-direction: column;
  gap: 1em;
}

.actions .flip-button {
  flex: 1;
  font-size: 0.9em;
  padding: 0.75em 1em;
}

.frame-navigation {
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex: 1;
}

.frame-navigation .flip-button {
  flex: 1;
  padding: 0.75em 0.5em;
  font-size: 0.9em;
}

.frame-counter {
  font-size: 0.9em;
  font-weight: 600;
  padding: 0.75em 1em;
  background: var(--main-color, #00b894);
  color: white;
  border-radius: var(--border-radius, 4px);
  text-align: center;
  border: none;
  transition: all 0.2s ease;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25em;
}

.frame-count {
  font-weight: 700;
}

.time-display {
  font-size: 0.8em;
  opacity: 0.9;
}

@media (min-width: 1024px) {
  .actions {
    position: absolute;
    top: 0;
    right: calc(var(--actions-width) * -1);
    width: var(--actions-width);
  }
}

@media (max-width: 1024px) {
  .actions {
    margin-top: 4em;
    flex-direction: row;
    gap: 0.2em;
    align-items: stretch;
  }
  
  .actions .flip-button {
    height: auto;
    min-height: 2.5em;
  }
}
</style>
