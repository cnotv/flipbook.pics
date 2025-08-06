<script lang="ts" setup>
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * MediaStreamTrackProcessor? https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrackProcessor
 * VideoDecoder? https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder
 * HTMLVideoElement.requestVideoFrameCallback? https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement
 */
import { ref, computed, watch } from "vue";
import * as pdfMake from "pdfmake/build/pdfmake";
import FlipButton from "../components/FlipButton.vue";
import FlipSlider from "../components/FlipSlider.vue";
import FlipFile from "../components/FlipFile.vue";
import FlipFrames from "../components/FlipFrames.vue";
import FlipActions from "../components/FlipActions.vue";
import {
  calculateTargetFrameTimes,
  shouldCaptureFrame,
  calculateOptimalPlaybackRate,
} from "../helper/frameGeneration";

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

const fps = ref("30");
const playbackSpeed = ref("0");
const currentFrameIndex = ref(0);
const videoDuration = ref(0);
const videoSrc = ref<string | null>();
const cover = ref<string | null>();
const video = ref<HTMLVideoElement>();
const status = ref(STATUS.empty);

const canvas = ref<HTMLCanvasElement>();
const totalFrames = ref<string[]>([]);
const frames = ref<string[]>([]);
const videoAspectRatio = ref<number>(16 / 9); // Default aspect ratio

/**
 * Format time in seconds to MM:SS.mmm format (with milliseconds)
 */
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const wholeSeconds = Math.floor(remainingSeconds);
  const milliseconds = Math.floor((remainingSeconds - wholeSeconds) * 1000);

  return `${minutes}:${wholeSeconds
    .toString()
    .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
};

/**
 * Calculate current time based on frame position within the video duration
 */
const currentTime = computed(() => {
  if (frames.value.length === 0 || videoDuration.value === 0) {
    return formatTime(0);
  }

  // Calculate the time position based on current frame relative to total frames
  const timeInSeconds =
    (currentFrameIndex.value / (frames.value.length - 1)) * videoDuration.value;
  return formatTime(timeInSeconds);
});

/**
 * Calculate total video time from the video duration
 */
const totalTime = computed(() => {
  return formatTime(videoDuration.value);
});

const targetFrameTimes = ref<number[]>([]);
const currentTargetIndex = ref(0);

// Animation state for frame playback
const isPlaying = ref(false);
const playInterval = ref<NodeJS.Timeout | null>(null);

/**
 * Calculate animation interval based on playback speed
 */
const calculateAnimationInterval = (speed: number): number => {
  // Base interval of 100ms (10 FPS), modified by speed
  // Positive speed = faster, negative speed = slower
  // Speed 0 = default (100ms), Speed 1 = 50ms, Speed -1 = 200ms
  if (speed === 0) {
    return 100; // Default: 10 FPS
  } else if (speed > 0) {
    // Faster playback: reduce interval (min 16ms = ~60 FPS)
    return Math.max(16, 100 / (1 + speed));
  } else {
    // Slower playback: increase interval (max 2000ms = 0.5 FPS)
    return Math.min(2000, 100 * (1 + Math.abs(speed)));
  }
};

/**
 * Watch playback speed changes and update animation in real-time
 */
watch(playbackSpeed, (newSpeed) => {
  // Only update if currently playing
  if (isPlaying.value && playInterval.value) {
    // Clear current interval
    clearInterval(playInterval.value);

    // Calculate new interval
    const speed = parseFloat(newSpeed) || 0;
    const intervalMs = calculateAnimationInterval(speed);

    // Start new interval with updated speed
    playInterval.value = setInterval(() => {
      // Move to next frame, loop back to start when reaching the end
      if (currentFrameIndex.value < frames.value.length - 1) {
        currentFrameIndex.value++;
      } else {
        currentFrameIndex.value = 0; // Loop back to first frame
      }
    }, intervalMs);
  }
});

/**
 * Video callback loop for capturing frames at precise time intervals
 */
const getFrame = async (
  _: DOMHighResTimeStamp,
  { width, height }: VideoFrameMetadata
) => {
  // Update aspect ratio based on actual video dimensions
  videoAspectRatio.value = width / height;

  const videoEl = video.value!;
  const currentTime = videoEl.currentTime;

  // Check if we should capture this frame using utility function
  if (shouldCaptureFrame(currentTime, targetFrameTimes.value, currentTargetIndex.value)) {
    // Process frame immediately during video capture
    await drawFrame(width, height, canvas.value!);
    currentTargetIndex.value++;
  }

  // Continue until video ends or all target frames captured
  if (!videoEl.ended && currentTargetIndex.value < targetFrameTimes.value.length) {
    videoEl["requestVideoFrameCallback"](getFrame);
  } else {
    // Final update when done
    updateFrames();
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

      // Wait for video metadata to be loaded (this ensures duration is available)
      await new Promise((resolve, reject) => {
        const handleMetadata = () => {
          videoEl.removeEventListener("loadedmetadata", handleMetadata);
          videoEl.removeEventListener("error", handleError);
          // Capture duration and aspect ratio immediately
          videoDuration.value = videoEl.duration;
          videoAspectRatio.value = videoEl.videoWidth / videoEl.videoHeight;
          resolve(undefined);
        };

        const handleError = (error: Event) => {
          videoEl.removeEventListener("loadedmetadata", handleMetadata);
          videoEl.removeEventListener("error", handleError);
          reject(error);
        };

        videoEl.addEventListener("loadedmetadata", handleMetadata);
        videoEl.addEventListener("error", handleError);
      });

      // Now generate frames
      generateFrames();
    }
  } catch (error) {
    status.value = STATUS.error;
  }
};

/**
 * Generate frames from videos from given uploaded video file
 */
const generateFrames = () => {
  totalFrames.value = [];
  currentTargetIndex.value = 0;

  const videoEl = video.value;
  if (videoEl) {
    // Wait for video metadata to load to get accurate dimensions and duration
    videoEl.addEventListener("loadedmetadata", () => {
      videoAspectRatio.value = videoEl.videoWidth / videoEl.videoHeight;
      videoDuration.value = videoEl.duration;

      // Calculate deterministic frame capture times using utility function
      const targetFps = parseInt(fps.value) || 30;
      targetFrameTimes.value = calculateTargetFrameTimes(videoEl.duration, targetFps);

      // Reset video to start and begin capture
      videoEl.currentTime = 0;

      // Calculate optimal playback rate for consistent processing
      videoEl.playbackRate = calculateOptimalPlaybackRate(videoEl.duration, targetFps);
    });

    videoEl.play();
    videoEl["requestVideoFrameCallback"](getFrame);
  }
};

/**
 * Reset stored video information
 */
const resetVideo = () => {
  // Stop any playing animation
  if (playInterval.value) {
    clearInterval(playInterval.value);
    playInterval.value = null;
  }
  isPlaying.value = false;

  status.value = STATUS.empty;
  videoSrc.value = null;
  totalFrames.value = [];
  frames.value = [];
  currentFrameIndex.value = 0;
  videoDuration.value = 0; // Reset duration to 0
  targetFrameTimes.value = [];
  currentTargetIndex.value = 0;
};

/**
 * Toggle frame playback - start/stop looping through frames
 */
const togglePlay = () => {
  if (isPlaying.value) {
    // Stop playing
    if (playInterval.value) {
      clearInterval(playInterval.value);
      playInterval.value = null;
    }
    isPlaying.value = false;
  } else {
    // Start playing
    if (frames.value.length > 0) {
      isPlaying.value = true;

      // Calculate interval based on playback speed slider using helper function
      const speed = parseFloat(playbackSpeed.value) || 0;
      const intervalMs = calculateAnimationInterval(speed);

      playInterval.value = setInterval(() => {
        // Move to next frame, loop back to start when reaching the end
        if (currentFrameIndex.value < frames.value.length - 1) {
          currentFrameIndex.value++;
        } else {
          currentFrameIndex.value = 0; // Loop back to first frame
        }
      }, intervalMs);
    }
  }
};

/**
 * Navigate to previous frame
 */
const previousFrame = () => {
  // Stop playing when manually navigating
  if (playInterval.value) {
    clearInterval(playInterval.value);
    playInterval.value = null;
  }
  isPlaying.value = false;

  if (currentFrameIndex.value > 0) {
    currentFrameIndex.value--;
  }
};

/**
 * Navigate to next frame
 */
const nextFrame = () => {
  // Stop playing when manually navigating
  if (playInterval.value) {
    clearInterval(playInterval.value);
    playInterval.value = null;
  }
  isPlaying.value = false;

  if (currentFrameIndex.value < frames.value.length - 1) {
    currentFrameIndex.value++;
  }
};

/**
 * Update frames array with captured frames - now deterministic based on time intervals
 */
const updateFrames = () => {
  // Stop any playing animation when frames change
  if (playInterval.value) {
    clearInterval(playInterval.value);
    playInterval.value = null;
  }
  isPlaying.value = false;

  // With our new deterministic approach, totalFrames already contains
  // the exact frames we want based on the FPS setting and precise timing
  frames.value = [...totalFrames.value];

  // Reset current frame index when frames change
  currentFrameIndex.value = 0;

  // Automatically start playing after frames are generated
  if (frames.value.length > 0) {
    setTimeout(() => {
      togglePlay();
    }, 100);
  }
};

/**
 * Handle FPS changes - regenerate frames with new FPS and toggle play
 */
const handleFpsChange = () => {
  // Only regenerate if we have a video loaded
  if (videoSrc.value && video.value) {
    generateFrames();
  }
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
