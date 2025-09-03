<script lang="ts" setup>
/**
 * MediaStreamTrackProcessor? https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrackProcessor
 * VideoDecoder? https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder
 * HTMLVideoElement.requestVideoFrameCallback? https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement
 */
import { ref, computed } from "vue";
import * as pdfMake from "pdfmake/build/pdfmake";
import FlipButton from "../components/FlipButton.vue";
import FlipSlider from "../components/FlipSlider.vue";
import FlipFile from "../components/FlipFile.vue";
import FlipFrames from "../components/FlipFrames.vue";
import FlipActions from "../components/FlipActions.vue";
import FlipSizeSelector from "../components/FlipSizeSelector.vue";
import { useVideoFrames } from "../composables/useVideoFrames";

enum STATUS {
  empty,
  loading,
  loaded,
  error,
}

const status = ref(STATUS.empty);
const cover = ref<string | null>(null);

// Use the video frames composable
const {
  fps,
  playbackSpeed,
  currentFrameIndex,
  videoDuration,
  videoSrc,
  video,
  canvas,
  frames,
  videoAspectRatio,
  currentTime,
  totalTime,
  isPlaying,
  loadingStatus,
  loadingText,
  flipbookWidth,
  flipbookHeight,
  handleVideoUpload: composableHandleVideoUpload,
  loadSampleVideo: composableLoadSampleVideo,
  resetVideo: composableResetVideo,
  togglePlay,
  previousFrame,
  nextFrame,
  setFramePosition,
  handleFpsChange,
  setFlipbookSize,
  LOADING_STATUS,
} = useVideoFrames();

/**
 * Estimate the number of frames that will be generated
 */
const estimatedFrameCount = computed(() => {
  const fpsValue = parseInt(fps.value) || 0;
  const duration = videoDuration.value || 0;

  if (fpsValue === 0 || duration === 0) {
    return 0;
  }

  return Math.ceil(fpsValue * duration);
});

/**
 * Calculate CSS frame dimensions based on flipbook size
 */
const frameDimensions = computed(() => {
  const pixelsPerInch = 60; // Scale factor for display
  const width = flipbookWidth.value * pixelsPerInch;
  const height = flipbookHeight.value * pixelsPerInch;
  const maxWidth = 560; // Maximum display width

  // Scale down if too large
  const scale = Math.min(1, maxWidth / width);

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    aspectRatio: flipbookWidth.value / flipbookHeight.value,
  };
});

/**
 * Add cover to the frames preview
 */
const handleCoverUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file: File = target.files![0];
  const reader = new FileReader();

  reader.readAsDataURL(file);
  reader.onload = () => {
    cover.value = String(reader.result);
  };
};

/**
 * Load video, render it and add to the frames preview
 */
const handleVideoUpload = async (event: Event) => {
  try {
    status.value = STATUS.loading;
    await composableHandleVideoUpload(event);
    status.value = STATUS.loaded;
  } catch (error) {
    status.value = STATUS.error;
    console.error("Failed to upload video:", error);
  }
};

/**
 * Load sample video kekeflipnote.mp4
 * Reference: https://www.instagram.com/p/C25hJPEpJMk/
 */
const loadSampleVideo = async () => {
  status.value = STATUS.loading;

  try {
    await composableLoadSampleVideo();
    status.value = STATUS.loaded;
  } catch (error) {
    status.value = STATUS.error;
  }
};

/**
 * Reset stored video information
 */
const resetVideo = () => {
  composableResetVideo();
  status.value = STATUS.empty;
  cover.value = null;
};

/**
 * Handle flipbook size change
 */
const handleFlipbookSizeChange = (size: { width: number; height: number }) => {
  setFlipbookSize(size.width, size.height);
};
const printPreview = () => {
  // Calculate dimensions maintaining aspect ratio
  const maxWidth = 480 / 1.5;
  const maxHeight = 288 / 1.5;

  let pdfWidth, pdfHeight;
  if (videoAspectRatio.value > maxWidth / maxHeight) {
    // Video is wider, constrain by width
    pdfWidth = maxWidth;
    pdfHeight = maxWidth / videoAspectRatio.value;
  } else {
    // Video is taller, constrain by height
    pdfHeight = maxHeight;
    pdfWidth = maxHeight * videoAspectRatio.value;
  }

  // Create content array starting with cover if available
  const content = [];

  // Add cover as first page if it exists
  if (cover.value) {
    content.push({
      image: cover.value,
      width: pdfWidth,
      height: pdfHeight,
      alignment: "center" as const,
    });
  }

  // Add all video frames
  frames.value.forEach((image) => {
    content.push({
      image,
      width: pdfWidth,
      height: pdfHeight,
      alignment: "center" as const,
    });
  });

  const document = {
    pageMargins: [5, 5, 5, 5] as [number, number, number, number],
    content,
  };
  pdfMake.createPdf(document).download();
};
</script>

<template>
  <section
    class="loader-frame"
    :style="{
      '--frame-width': frameDimensions.width + 'px',
      '--frame-height': frameDimensions.height + 'px',
      '--video-ratio': (1 / frameDimensions.aspectRatio).toString(),
      width: frameDimensions.width + 'px',
      height: frameDimensions.height + 'px',
    }"
  >
    <!-- loading video before the src causes error in the DOM -->
    <template v-if="videoSrc">
      <FlipFrames
        :frames="frames"
        :cover="cover"
        :current-frame-index="currentFrameIndex"
        :loading-status="loadingStatus"
        :loading-text="loadingText"
        :LOADING_STATUS="LOADING_STATUS"
      />

      <!-- Video and canvas for frame capture -->
      <video ref="video" class="loader-frame__video" muted>
        <source :src="videoSrc" type="video/mp4" />
        <source :src="videoSrc" type="video/webm" />
        Your browser does not support the video tag.
      </video>
      <canvas class="loader-frame__canvas" ref="canvas"></canvas>
    </template>

    <FlipFile
      v-if="status === STATUS.empty"
      id="video"
      accept="video/*"
      @change="handleVideoUpload"
    >
      <h2>Add Video +</h2>
    </FlipFile>

    <div class="loader-frame__spinner" v-if="status === STATUS.loading"></div>

    <div class="loader-frame__error" v-if="status === STATUS.error">
      <p class="loader-frame__error-message">
        Error loading video. Please try again or upload a different video.
      </p>
      <FlipButton @click="status = STATUS.empty">Try Again</FlipButton>
    </div>
  </section>

  <!-- Actions under the video -->
  <template v-if="status === STATUS.loaded">
    <FlipActions
      :frames="frames"
      :isPlaying="isPlaying"
      :currentFrameIndex="currentFrameIndex"
      :currentTime="currentTime"
      :totalTime="totalTime"
      :cover="cover"
      @reset="resetVideo()"
      @togglePlay="togglePlay()"
      @print="printPreview()"
      @previousFrame="previousFrame()"
      @nextFrame="nextFrame()"
      @framePositionChange="setFramePosition"
      @coverUpload="handleCoverUpload"
      @removeCover="cover = null"
    />
  </template>

  <!-- Load Sample Video - always visible -->
  <div class="sample-video">
    <FlipButton @click="loadSampleVideo()"> Load Sample Video </FlipButton>
    <p class="sample-video__reference">
      <a
        class="sample-video__link"
        href="https://www.instagram.com/p/C25hJPEpJMk/"
        target="_blank"
        rel="noopener"
      >
        Reference: @kekeflipnote
      </a>
    </p>
  </div>

  <!-- Flipbook Size Selector -->
  <FlipSizeSelector
    v-if="status === STATUS.loaded"
    @size-change="handleFlipbookSizeChange"
  />

  <section v-if="status === STATUS.loaded" class="loader-sliders">
    <FlipSlider
      id="fps"
      v-model="fps"
      label="FPS:"
      :min="1"
      :max="120"
      @change="handleFpsChange"
      :show-info="videoDuration > 0"
      :info-text="`Estimated frame count: ${(estimatedFrameCount - 1).toLocaleString()}`"
    >
    </FlipSlider>

    <FlipSlider
      id="playbackSpeed"
      v-model="playbackSpeed"
      label="Playback speed:"
      :min="-10"
      :max="10"
      :step="0.1"
    ></FlipSlider>
  </section>
</template>

<style lang="scss">
/* CSS variables are now set dynamically in the template */
.loader-sliders {
  width: 100%;
  max-width: 560px;
  margin: 2rem auto;
}

.sample-video {
  text-align: center;
  margin: 2rem auto;
  padding: 1rem;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  align-items: center;

  &__reference {
    margin-top: 0.5em;
    font-size: 0.9em;
    opacity: 0.8;
    text-align: center;
  }

  &__link {
    color: inherit;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.loader-frame {
  cursor: pointer;
  position: relative;
  min-width: 200px;
  min-height: 150px;
  border: var(--border);
  box-sizing: content-box;
  margin-bottom: 2rem;
  margin-top: 1em;
  margin-left: auto;
  margin-right: auto;
  max-width: 100%;
  border-radius: var(--border-radius);
  transition: all 0.3s ease;

  &:hover {
    background-color: var(--main-color-a);
  }

  &__video,
  &__canvas {
    display: none;
  }

  &__spinner {
    width: 3em;
    height: 3em;
    border: var(--border);
    border-style: dashed;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    border-radius: 50%;
    animation: rotate360 2s linear infinite;
  }

  &__error {
    text-align: center;
    padding: 2em;
    color: #ff6b6b;

    &-message {
      margin-bottom: 1em;
    }
  }

  @media (min-width: 1024px) {
    margin-bottom: 8em;
  }
}

@keyframes rotate360 {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
