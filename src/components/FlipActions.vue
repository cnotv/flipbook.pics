<script lang="ts" setup>
import { ref } from "vue";
import FlipButton from "./FlipButton.vue";
import FlipSlider from "./FlipSlider.vue";

interface Props {
  frames: string[];
  isPlaying: boolean;
  currentFrameIndex: number;
  currentTime: string;
  totalTime: string;
  cover?: string | null;
  fps: string;
  playbackSpeed: string;
  videoDuration: number;
  estimatedFrameCount: number;
}

interface Emits {
  (e: "reset"): void;
  (e: "togglePlay"): void;
  (e: "print"): void;
  (e: "previousFrame"): void;
  (e: "nextFrame"): void;
  (e: "framePositionChange", index: number): void;
  (e: "coverUpload", event: Event): void;
  (e: "removeCover"): void;
  (e: "fpsChange"): void;
  (e: "update:fps", value: string): void;
  (e: "update:playbackSpeed", value: string): void;
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
  <div class="flip-actions">
    <div class="flip-actions__media">
      <FlipButton @click="$emit('reset')">X</FlipButton>
      <FlipButton :disabled="frames.length === 0" @click="$emit('togglePlay')">
        {{ isPlaying ? "⏸" : "▶" }}
      </FlipButton>

      <!-- Frame position slider -->
      <div class="flip-actions__slider" v-if="frames.length > 1">
        <input
          type="range"
          :value="currentFrameIndex"
          :min="0"
          :max="frames.length - 1"
          :step="1"
          @input="
            $emit(
              'framePositionChange',
              Number(($event.target as HTMLInputElement).value),
            )
          "
          class="flip-actions__range"
        />
      </div>
      <!-- Cover upload/remove -->
      <template v-if="!cover">
        <FlipButton @click="triggerCoverUpload" class="flip-actions__cover-upload">
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

      <FlipButton :disabled="frames.length === 0" @click="$emit('print')">
        Print
      </FlipButton>

      <!-- Frame navigation -->
      <div class="flip-actions__navigation" v-if="frames.length > 0">
        <FlipButton :disabled="currentFrameIndex === 0" @click="$emit('previousFrame')">
          ←
        </FlipButton>
        <div class="flip-actions__counter">
          <div class="flip-actions__count">
            {{ currentFrameIndex + 1 }} / {{ frames.length }}
          </div>
          <div class="flip-actions__time">{{ currentTime }} / {{ totalTime }}</div>
        </div>
        <FlipButton
          :disabled="currentFrameIndex >= frames.length - 1"
          @click="$emit('nextFrame')"
        >
          →
        </FlipButton>
      </div>
    </div>

    <!-- FPS and Playback Speed Controls -->
    <div class="flip-actions__controls">
      <FlipSlider
        id="fps"
        :model-value="fps"
        @update:model-value="$emit('update:fps', String($event))"
        label="FPS:"
        :min="1"
        :max="120"
        @change="$emit('fpsChange')"
        :show-info="videoDuration > 0"
        :info-text="`Estimated frame count: ${(
          estimatedFrameCount - 1
        ).toLocaleString()}`"
      >
      </FlipSlider>

      <FlipSlider
        id="playbackSpeed"
        :model-value="playbackSpeed"
        @update:model-value="$emit('update:playbackSpeed', String($event))"
        label="Playback speed:"
        :min="-10"
        :max="10"
        :step="0.1"
      ></FlipSlider>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.flip-actions {
  display: flex;
  flex-direction: column;
  gap: 1em;
  max-width: 560px;
  margin: auto;

  .flip-button {
    flex: 1;
    font-size: 0.9em;
    padding: 0.75em 1em;
  }

  &__media {
    display: flex;
    align-items: center;
    gap: 1em;
    justify-content: center;
  }

  &__slider {
    margin: 0;
    padding: 0;
    width: 100%;
  }

  &__range {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: var(--color-background-mute, #f2f2f2);
    outline: none;
    cursor: pointer;
    border: none;
    appearance: none;
    margin: 0;
    padding: 0;

    &::-webkit-slider-thumb {
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--main-color, #00b894);
      cursor: pointer;
      border: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

      &:hover {
        transform: scale(1.1);
      }
    }

    &::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--main-color, #00b894);
      cursor: pointer;
      border: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    &::-moz-range-track {
      height: 6px;
      background: var(--color-background-mute, #f2f2f2);
      border-radius: 3px;
      border: none;
    }
  }

  &__navigation {
    display: flex;
    align-items: center;
    gap: 0.5em;
    flex: 1;

    .flip-button {
      flex: 1;
      padding: 0.75em 0.5em;
      font-size: 0.9em;
    }
  }

  &__counter {
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
    min-width: 100px;
  }

  &__count {
    font-weight: 700;
  }

  &__time {
    font-size: 0.8em;
    opacity: 0.9;
  }

  &__controls {
    display: flex;
    flex-direction: column;
    gap: 1em;
    padding-top: 1em;
  }

  @media (max-width: 1024px) {
    margin-top: 4em;
    flex-direction: column;
    gap: 0.5em;
    align-items: stretch;

    .flip-button {
      height: auto;
      min-height: 2.5em;
    }

    &__slider {
      order: -1; /* Place slider above other controls */
      margin-bottom: 0.5em;
    }

    &__navigation {
      flex-direction: row;
      gap: 0.2em;
    }
  }
}
</style>
