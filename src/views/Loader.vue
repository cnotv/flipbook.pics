<script lang="ts" setup>
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * MediaStreamTrackProcessor? https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrackProcessor
 * VideoDecoder? https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder
 * HTMLVideoElement.requestVideoFrameCallback? https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement
 */
import { ref } from "vue";
import * as pdfMake from "pdfmake/build/pdfmake";

enum STATUS {
  empty,
  loading,
  loaded,
  error,
}

let pagesAmount = ref("6");
let framesAmount = ref("50");
let videoSrc = ref();
let cover = ref();
const video = ref<HTMLVideoElement>();
const status = ref(STATUS.empty);

let canvas = ref<HTMLCanvasElement>();
const frames = ref<string[]>([]);

/**
 * Video callback loop for capturing frames
 */
const getFrame = async (
  _: DOMHighResTimeStamp,
  { width, height }: VideoFrameMetadata
) => {
  await drawFrame(width, height, canvas.value!);
  if (!video.value!.ended) {
    video.value!["requestVideoFrameCallback"](getFrame);
  }
};

/**
 * Generate image frame from the video using canvas and store it in data64
 */
const drawFrame = async (width: number, height: number, page: HTMLCanvasElement) => {
  const bitmap = await createImageBitmap(video.value!);
  page.width = width;
  page.height = height;
  const ctx = page.getContext("2d");
  if (ctx) {
    ctx.drawImage(bitmap, 0, 0);
    let image = page.toDataURL("image/jpeg");
    frames.value.push(image);
  }
};
/**
 * Add cover to the frames preview
 */
const handleCoverUpload = (event) => {
  const file: File = event.target.files[0];
  let reader = new FileReader();

  reader.readAsDataURL(file);
  reader.onload = () => {
    cover.value = String(reader.result);
  };
};

/**
 * Load video, render it and add to the frames preview
 */
const handleVideoUpload = (event) => {
  status.value = STATUS.loading;
  const file: File = event.target.files[0];
  let reader = new FileReader();

  reader.readAsDataURL(file);
  reader.onload = () => {
    videoSrc.value = String(reader.result);
  };
  reader.onloadend = () => {
    status.value = STATUS.loaded;
    generateFrames();
  };
};

const generateFrames = () => {
  frames.value = [];
  const videoEl = video.value;
  if (videoEl) {
    videoEl.playbackRate = 5.0;
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
  frames.value = [];
};

/**
 * Flip pages again
 */
const flipPages = () => {
  generateFrames();
};

/**
 * Generate PDF from frames and navigate to preview page
 */
const printPreview = () => {
  const content = frames.value.map((image) => ({
    image,
    width: 480 / 1.5,
    heigth: 288 / 1.5,
    alignment: "center",
  }));
  const document = {
    pageMargins: [5, 5, 5, 5],
    content,
  };
  pdfMake.createPdf(document, null).download();
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
          <source type="video/webm" :src="videoSrc" />
          <source type="video/mp4" :src="videoSrc" />
        </video>
        <canvas class="canvas" ref="canvas"></canvas>

        <div class="actions">
          <button class="actions__button" @click="resetVideo()">X</button>
          <button class="actions__button" :disabled="!frames.length" @click="flipPages()">
            >
          </button>
          <button
            class="actions__button"
            :disabled="!frames.length"
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
      </div>

      <div class="loader" v-if="status === STATUS.loading"></div>
    </section>

    <section>
      <label for="pagesAmount">Pages:</label>
      <input v-model="pagesAmount" type="range" min="0" :max="frames.length" />
      <input id="pagesAmount" v-model="pagesAmount" type="number" />
      <p>Max pages: {{ frames.length }}</p>

      <label for="framesAmount"> Frames:</label>
      <input v-model="framesAmount" type="range" min="0" :max="frames.length" />
      <input id="framesAmount" v-model="framesAmount" type="number" />
      <p>Max frames: {{ frames.length }}</p>
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
}

.frames__item {
  position: absolute;
  width: var(--frame-width);
  height: var(--frame-height);
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
