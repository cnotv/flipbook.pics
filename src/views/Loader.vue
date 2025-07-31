<script lang="ts" setup>
/* eslint-disable @typescript-eslint/no-non-null-assertion */
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

interface VideoFrameMetadata {
  width: number;
  height: number;
}

enum STATUS {
  empty,
  loading,
  loaded,
  error,
}

const framesAmount = ref("0");
const playbackDelay = ref("0");
const videoSrc = ref<string | null>();
const cover = ref<string | null>();
const video = ref<HTMLVideoElement>();
const status = ref(STATUS.empty);

const canvas = ref<HTMLCanvasElement>();
const totalFrames = ref<string[]>([]);
const frames = ref<string[]>([]);
const videoAspectRatio = ref<number>(16 / 9); // Default aspect ratio

/**
 * Video callback loop for capturing frames
 */
const getFrame = async (
  _: DOMHighResTimeStamp,
  { width, height }: VideoFrameMetadata
) => {
  // Update aspect ratio based on actual video dimensions
  videoAspectRatio.value = width / height;
  await drawFrame(width, height, canvas.value!);
  updateFrames();
  if (!video.value!.ended) {
    video.value!["requestVideoFrameCallback"](getFrame);
  } else {
    // Video has ended, set framesAmount to total frames generated
    framesAmount.value = totalFrames.value.length.toString();
    updateFrames(); // Update frames one more time with the final count
  }
};

/**
 * Generate image frame from the video using canvas and store it in data64
 */
const drawFrame = async (width: number, height: number, page: HTMLCanvasElement) => {
  const bitmap = await createImageBitmap(video.value!);

  // Use a consistent canvas size that matches our CSS frame dimensions
  const frameWidth = 560; // matches --frame-width
  const frameHeight = Math.round(frameWidth * (9 / 16)); // matches --frame-height calculation

  page.width = frameWidth;
  page.height = frameHeight;

  const ctx = page.getContext("2d");
  if (ctx) {
    // Clear canvas
    ctx.clearRect(0, 0, frameWidth, frameHeight);

    // Calculate dimensions to fit the video within the frame while maintaining aspect ratio
    const videoAspect = width / height;
    const frameAspect = frameWidth / frameHeight;

    let drawWidth, drawHeight, drawX, drawY;

    if (videoAspect > frameAspect) {
      // Video is wider - fit to width
      drawWidth = frameWidth;
      drawHeight = frameWidth / videoAspect;
      drawX = 0;
      drawY = (frameHeight - drawHeight) / 2;
    } else {
      // Video is taller - fit to height
      drawHeight = frameHeight;
      drawWidth = frameHeight * videoAspect;
      drawX = (frameWidth - drawWidth) / 2;
      drawY = 0;
    }

    // Draw the image centered and maintaining aspect ratio
    ctx.drawImage(bitmap, drawX, drawY, drawWidth, drawHeight);
    const image = page.toDataURL("image/jpeg", 0.9);
    totalFrames.value.push(image);
  }
};
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
  const target = event.target as HTMLInputElement;
  const file: File = target.files![0];
  const reader = new FileReader();

  reader.readAsDataURL(file);
  reader.onload = () => {
    videoSrc.value = String(reader.result);
  };
  reader.onloadend = () => {
    status.value = STATUS.loaded;
    generateFrames();
  };
};

/**
 * Load sample video kekeflipnote.mp4
 * Reference: https://www.instagram.com/p/C25hJPEpJMk/
 */
const loadSampleVideo = async () => {
  status.value = STATUS.loading;

  try {
    // Set the video source
    videoSrc.value = "/kekeflipnote.mp4";
    status.value = STATUS.loaded;

    // Wait for Vue to update the DOM
    await new Promise((resolve) => setTimeout(resolve, 200));

    const videoEl = video.value;
    if (videoEl) {
      // Ensure video loads the new source
      videoEl.load();

      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        const handleLoad = () => {
          videoEl.removeEventListener("canplay", handleLoad);
          videoEl.removeEventListener("error", handleError);
          resolve(undefined);
        };

        const handleError = (error: Event) => {
          videoEl.removeEventListener("canplay", handleLoad);
          videoEl.removeEventListener("error", handleError);
          reject(error);
        };

        videoEl.addEventListener("canplay", handleLoad);
        videoEl.addEventListener("error", handleError);
      });

      // Now generate frames
      generateFrames();
    }
  } catch (error) {
    console.error("Error loading sample video:", error);
    status.value = STATUS.error;
  }
};

/**
 * Generate frames from videos from given uploaded video file
 */
const generateFrames = () => {
  totalFrames.value = [];
  const videoEl = video.value;
  if (videoEl) {
    // Wait for video metadata to load to get accurate dimensions
    videoEl.addEventListener("loadedmetadata", () => {
      videoAspectRatio.value = videoEl.videoWidth / videoEl.videoHeight;
    });

    videoEl.playbackRate = 10.0;
    videoEl.play();
    videoEl["requestVideoFrameCallback"](getFrame);
  }
};

/**
 * Reset stored video information
 */
const resetVideo = () => {
  status.value = STATUS.empty;
  videoSrc.value = null;
  totalFrames.value = [];
  frames.value = [];
};

/**
 * Flip pages again
 */
const flipPages = () => {
  generateFrames();
};

/**
 * Get actual frames from given video frames, sampling evenly based on framesAmount
 */
const updateFrames = () => {
  const targetFrameCount = Math.max(1, parseInt(framesAmount.value) || 1);
  const totalFrameCount = totalFrames.value.length;

  if (totalFrameCount === 0) {
    frames.value = [];
    return;
  }

  // Ensure framesAmount doesn't exceed total frames
  const actualTargetCount = Math.min(targetFrameCount, totalFrameCount);

  if (actualTargetCount >= totalFrameCount) {
    // If target is greater than or equal to total, use all frames
    frames.value = [...totalFrames.value];
    return;
  }

  // Sample frames evenly across the video to maintain consistency
  const sampledFrames: string[] = [];
  const step = totalFrameCount / actualTargetCount;

  for (let i = 0; i < actualTargetCount; i++) {
    const frameIndex = Math.floor(i * step);
    sampledFrames.push(totalFrames.value[frameIndex]);
  }

  frames.value = sampledFrames;
};

/**
 * Generate PDF from frames and navigate to preview page
 */
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
  <div>
    <section class="frame">
      <!-- loading video before the src causes error in the DOM -->
      <template v-if="videoSrc">
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
          <img
            class="frames__item"
            :class="{ 'frames__item--flipped': index < frames.length - 1 }"
            :style="{
              zIndex: -index,
              display: index < frames.length - 10 ? 'none' : 'block',
            }"
            :src="frame"
            alt=""
            v-for="(frame, index) in frames"
            :key="index"
          />
        </div>
        <video ref="video" class="video" muted>
          <source :src="videoSrc" type="video/mp4" />
          <source :src="videoSrc" type="video/webm" />
          Your browser does not support the video tag.
        </video>
        <canvas class="canvas" ref="canvas"></canvas>

        <div class="actions">
          <FlipButton @click="resetVideo()">X</FlipButton>
          <FlipButton :disabled="!totalFrames.length" @click="flipPages()">
            >
          </FlipButton>
          <FlipButton :disabled="!totalFrames.length" @click="printPreview()">
            Print
          </FlipButton>
          <template v-if="!cover">
            <FlipFile
              id="cover"
              accept="image/*"
              @change="handleCoverUpload"
              class="cover-upload"
            >
              + Cover
            </FlipFile>
          </template>

          <FlipButton v-if="cover" @click="cover = null"> - Cover </FlipButton>
        </div>
      </template>

      <FlipFile id="video" accept="video/*" @change="handleVideoUpload">
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
          <a
            href="https://www.instagram.com/p/C25hJPEpJMk/"
            target="_blank"
            rel="noopener"
          >
            Reference: @kekeflipnote
          </a>
        </p>
      </div>
    </section>

    <section>
      <FlipSlider
        id="framesAmount"
        v-model="framesAmount"
        label="Frames:"
        :min="1"
        :max="totalFrames.length"
        :show-info="true"
        @change="updateFrames"
      >
        <template #info>
          <p>Max frames: {{ totalFrames.length }}</p>
          <p>Current frames: {{ frames.length }}</p>
        </template>
      </FlipSlider>
    </section>

    <section>
      <FlipSlider
        id="playbackDelay"
        v-model="playbackDelay"
        label="Playback Delay:"
        :min="0"
        :max="2"
        :step="0.1"
        :show-info="true"
      >
        <template #info>
          <p>Delay: {{ playbackDelay }}s</p>
          <p>For playback speed only</p>
        </template>
      </FlipSlider>
    </section>
  </div>
</template>

<style>
:root {
  --video-ratio: 9 / 16;
  --frame-padding: 50px;
  --frame-width: 560px;
  --frame-height: calc(var(--frame-width) * var(--video-ratio));
}

.file {
  position: relative;
}
.file__label {
  display: block;
  text-align: center;
  line-height: var(--frame-height);
}

.file__input {
  position: absolute;
  z-index: -1;
  opacity: 0;
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
  transition: transform 0.1s cubic-bezier(0.07, 0.94, 0.31, 0.9),
    opacity 0.025s cubic-bezier(0, 1.16, 0.16, 0.98);
}

.actions {
  display: flex;
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

  .actions {
    flex-direction: column;
    gap: 1em;
    position: absolute;
    top: 0;
    height: 3em;
    border: none;
    right: -23%;
    width: 130px;
  }
}
@media (max-width: 1024px) {
  .actions {
    margin-top: 4em;
    flex-direction: row;
    gap: 0.2em;
    height: 3em;
    border: none;
  }
}
</style>
