<script lang="ts" setup>
/**
 * MediaStreamTrackProcessor? https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrackProcessor
 * VideoDecoder? https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder
 * HTMLVideoElement.requestVideoFrameCallback? https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement
 */
import { ref } from "vue";
import * as pdfMake from "pdfmake/build/pdfmake";
import FlipButton from "../components/FlipButton.vue";
import FlipSlider from "../components/FlipSlider.vue";
import FlipFile from "../components/FlipFile.vue";
import FlipFrames from "../components/FlipFrames.vue";
import FlipActions from "../components/FlipActions.vue";
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
  videoSrc,
  video,
  canvas,
  frames,
  videoAspectRatio,
  currentTime,
  totalTime,
  isPlaying,
  handleVideoUpload: composableHandleVideoUpload,
  loadSampleVideo: composableLoadSampleVideo,
  generateFrames,
  resetVideo: composableResetVideo,
  togglePlay,
  previousFrame,
  nextFrame,
  handleFpsChange,
} = useVideoFrames();

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
const handleVideoUpload = (event: Event) => {
  status.value = STATUS.loading;
  composableHandleVideoUpload(event);
  status.value = STATUS.loaded;
  generateFrames();
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
  <section class="frame">
    <!-- loading video before the src causes error in the DOM -->
    <template v-if="videoSrc">
      <FlipFrames
        :frames="frames"
        :cover="cover"
        :current-frame-index="currentFrameIndex"
      />

      <!-- Video and canvas for frame capture -->
      <video ref="video" class="video" muted>
        <source :src="videoSrc" type="video/mp4" />
        <source :src="videoSrc" type="video/webm" />
        Your browser does not support the video tag.
      </video>
      <canvas class="canvas" ref="canvas"></canvas>

      <!-- Actions -->
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
        @coverUpload="handleCoverUpload"
        @removeCover="cover = null"
      />
    </template>

    <FlipFile
      v-if="status === STATUS.empty"
      id="video"
      accept="video/*"
      @change="handleVideoUpload"
    >
      <h2>Add Video +</h2>
    </FlipFile>

    <div class="loader" v-if="status === STATUS.loading"></div>

    <div class="error" v-if="status === STATUS.error">
      <p>Error loading video. Please try again or upload a different video.</p>
      <FlipButton @click="status = STATUS.empty">Try Again</FlipButton>
    </div>

    <div class="sample-video">
      <FlipButton @click="loadSampleVideo()"> Load Sample Video </FlipButton>
      <p class="sample-reference">
        <a href="https://www.instagram.com/p/C25hJPEpJMk/" target="_blank" rel="noopener">
          Reference: @kekeflipnote
        </a>
      </p>
    </div>
  </section>

  <section class="sliders">
    <FlipSlider
      id="fps"
      v-model="fps"
      label="FPS:"
      :min="1"
      :max="120"
      @change="handleFpsChange"
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

<style>
:root {
  --video-ratio: 9 / 16;
  --frame-padding: 50px;
  --frame-width: 560px;
  --actions-width: 200px;
  --frame-height: calc(var(--frame-width) * var(--video-ratio));
}

.sliders {
  width: var(--frame-width);

  margin-left: auto;
  margin-right: auto;
}

.sample-video {
  text-align: center;
  margin-top: 2em;
  padding: 1em;
  border-top: 1px solid var(--border-color, #ccc);
}

.sample-reference {
  margin-top: 0.5em;
  font-size: 0.9em;
  opacity: 0.8;
}

.sample-reference a {
  color: inherit;
  text-decoration: none;
}

.sample-reference a:hover {
  text-decoration: underline;
}

.frame {
  cursor: pointer;
  position: relative;
  width: var(--frame-width);
  height: var(--frame-height);
  border: var(--border);
  box-sizing: content-box;
  margin-bottom: 8em;
  margin-top: 1em;
  margin-left: auto;
  margin-right: auto;
  max-width: 100%;
  border-radius: var(--border-radius);
}
.frame:hover {
  background-color: var(--main-color-a);
}

.video,
.canvas {
  display: none;
}

.loader {
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

.error {
  text-align: center;
  padding: 2em;
  color: #ff6b6b;
}

.error p {
  margin-bottom: 1em;
}

@keyframes rotate360 {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 1024px) {
  .frame {
    margin-bottom: 8em;
  }
}
</style>
