<script lang="ts" setup>
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * MediaStreamTrackProcessor? https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrackProcessor
 * VideoDecoder? https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder
 * HTMLVideoElement.requestVideoFrameCallback? https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement
 */
import { ref } from "vue";
import { useRouter } from "vue-router";
import * as pdfMake from "pdfmake/build/pdfmake";

const router = useRouter();
let pagesAmount = ref("6");
let framesAmount = ref("50");
let videoSrc = ref();
let cover = ref();
const video = ref<HTMLVideoElement>();

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
  const file: File = event.target.files[0];
  let reader = new FileReader();

  reader.readAsDataURL(file);
  reader.onload = () => {
    videoSrc.value = String(reader.result);
  };
  reader.onloadend = () => {
    generateFrames();
  };
};

const generateFrames = () => {
  frames.value = [];
  const videoEl = video.value;
  if (videoEl) {
    videoEl.playbackRate = 10.0;
    videoEl.play();
    videoEl["requestVideoFrameCallback"](getFrame);
  }
};

/**
 * Reset stored video information
 */
const resetVideo = () => {
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
  // router.push("preview");
};
</script>

<template>
  <div>
    <section class="frame">
      <!-- loading video before the src causes error in the DOM -->
      <div v-if="videoSrc">
        <div class="frames">
          <img
            class="frames__item"
            :class="{ 'frames__item--flipped': index < frames.length - 1 }"
            :style="{ zIndex: -index }"
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
          <button class="delete-button" @click="resetVideo()">X</button>
          <button :disabled="!frames.length" @click="flipPages()">></button>
          <button :disabled="!frames.length" @click="printPreview()">Print</button>
          <template v-if="!cover">
            <label class="button" for="cover">+ Cover</label>
            <input
              class="file__input"
              type="file"
              id="cover"
              accept="image/*"
              @change="handleCoverUpload($event)"
            />
          </template>

          <button v-if="cover" @click="cover = null">- Cover</button>
        </div>
      </div>

      <div class="file" v-if="!videoSrc">
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
  --frame-width: 560px;
  --frame-height: calc(var(--frame-width) * var(--video-ratio));
}

label {
  cursor: pointer;
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
  width: var(--frame-width);
  height: var(--frame-height);
  border: var(--border);
  box-sizing: content-box;
  margin-bottom: 8em;
  max-width: 100%;
}
.frame:hover {
  background-color: var(--main-color-a);
}

.video,
.canvas {
  opacity: 0;
  position: absolute;
  z-index: -1;
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
}

.frames__item--flipped {
  transform: rotateY(-76deg);
  transform-origin: left center;
  opacity: 0.5;
  transition: transform 0.1s cubic-bezier(0.07, 0.94, 0.31, 0.9),
    opacity 0.025s cubic-bezier(0, 1.16, 0.16, 0.98);
}

.actions {
  display: flex;
  flex-direction: column;
  margin-top: 1em;
  gap: 1em;

  position: absolute;
  top: 0;
  height: 3em;
  border: none;
  right: -23%;
  width: 130px;
}
</style>
