<script lang="ts" setup>
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * MediaStreamTrackProcessor? https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrackProcessor
 * VideoDecoder? https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder
 * HTMLVideoElement.requestVideoFrameCallback? https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement
 */
import { ref } from "vue";
import * as pdfMake from "pdfmake/build/pdfmake";

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

const pagesAmount = ref("6");
const framesAmount = ref("50");
const startFrame = ref("0");
const endFrame = ref<string | number>();
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
 * Get actual frames from given video frames
 */
const updateFrames = () => {
  frames.value = totalFrames.value;
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

  const content = frames.value.map((image) => ({
    image,
    width: pdfWidth,
    height: pdfHeight,
    alignment: "center" as const,
  }));
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
          <img
            class="frames__item"
            :class="{ 'frames__item--flipped': index < totalFrames.length - 1 }"
            :style="{
              zIndex: -index,
              display: index < totalFrames.length - 10 ? 'none' : 'block',
            }"
            :src="frame"
            alt=""
            v-for="(frame, index) in frames"
            :key="index"
          />
        </div>
        <video ref="video" class="video" muted>
          <source type="video/webm" :src="videoSrc" />
          <source type="video/mp4" :src="videoSrc" />
        </video>
        <canvas class="canvas" ref="canvas"></canvas>

        <div class="actions">
          <button class="actions__button" @click="resetVideo()">X</button>
          <button
            class="actions__button"
            :disabled="!totalFrames.length"
            @click="flipPages()"
          >
            >
          </button>
          <button
            class="actions__button"
            :disabled="!totalFrames.length"
            @click="printPreview()"
          >
            Print
          </button>
          <template v-if="!cover">
            <label class="button actions__button" for="cover">+ Cover</label>
            <input
              class="file__input"
              type="file"
              id="cover"
              accept="image/*"
              @change="handleCoverUpload($event)"
            />
          </template>

          <button class="actions__button" v-if="cover" @click="cover = null">
            - Cover
          </button>
        </div>
      </template>

      <div class="file" v-if="status === STATUS.empty">
        <label class="file__label" for="video">
          <h2>Add Video +</h2>
        </label>
        <input
          class="file__input"
          type="file"
          id="video"
          accept="video/*"
          @change="handleVideoUpload($event)"
        />
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
      </div>

      <div class="loader" v-if="status === STATUS.loading"></div>
    </section>

    <section>
      <label for="pagesAmount">Pages:</label>
      <input v-model="pagesAmount" type="range" min="0" :max="totalFrames.length" />
      <input
        id="pagesAmount"
        v-model="pagesAmount"
        type="number"
        v-on:change="updateFrames"
      />
      <p>Max pages: {{ totalFrames.length }}</p>

      <label for="framesAmount"> Frames:</label>
      <input
        v-model="framesAmount"
        type="range"
        min="0"
        :max="totalFrames.length"
        v-on:change="updateFrames"
      />
      <input
        id="framesAmount"
        v-model="framesAmount"
        type="number"
        v-on:change="updateFrames"
      />
      <p>Max frames: {{ totalFrames.length }}</p>

      <label for="startFrame"> Start:</label>
      <input
        id="startFrame"
        v-model="startFrame"
        type="number"
        v-on:change="updateFrames"
      />

      <label for="endFrame"> End:</label>
      <input id="endFrame" v-model="endFrame" type="number" v-on:change="updateFrames" />
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
