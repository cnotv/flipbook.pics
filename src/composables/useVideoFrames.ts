import { ref, computed, watch } from "vue";
import {
  calculateTargetFrameTimes,
  shouldCaptureFrame,
  calculateOptimalPlaybackRate,
} from "../helper/frameGeneration";

interface VideoFrameMetadata {
  width: number;
  height: number;
}

enum VIDEO_STATUS {
  empty,
  loading,
  loaded,
  error,
}

export function useVideoFrames() {
  // Core state
  const fps = ref("30");
  const playbackSpeed = ref("0");
  const currentFrameIndex = ref(0);
  const videoDuration = ref(0);
  const videoSrc = ref<string | null>();
  const video = ref<HTMLVideoElement>();
  const status = ref(VIDEO_STATUS.empty);
  const canvas = ref<HTMLCanvasElement>();
  const totalFrames = ref<string[]>([]);
  const frames = ref<string[]>([]);
  const videoAspectRatio = ref<number>(16 / 9);

  // Frame generation state
  const targetFrameTimes = ref<number[]>([]);
  const currentTargetIndex = ref(0);

  // Animation state for frame playback
  const isPlaying = ref(false);
  const playInterval = ref<NodeJS.Timeout | null>(null);

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
      (currentFrameIndex.value / (frames.value.length - 1)) *
      videoDuration.value;
    return formatTime(timeInSeconds);
  });

  /**
   * Calculate total video time from the video duration
   */
  const totalTime = computed(() => {
    return formatTime(videoDuration.value);
  });

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
    { width, height }: VideoFrameMetadata,
  ) => {
    // Update aspect ratio based on actual video dimensions
    videoAspectRatio.value = width / height;

    const videoEl = video.value!;
    const currentTime = videoEl.currentTime;

    // Check if we should capture this frame using utility function
    if (
      shouldCaptureFrame(
        currentTime,
        targetFrameTimes.value,
        currentTargetIndex.value,
      )
    ) {
      // Process frame immediately during video capture
      await drawFrame(width, height, canvas.value!);
      currentTargetIndex.value++;
    }

    // Continue until video ends or all target frames captured
    if (
      !videoEl.ended &&
      currentTargetIndex.value < targetFrameTimes.value.length
    ) {
      videoEl["requestVideoFrameCallback"](getFrame);
    } else {
      // Final update when done
      updateFrames();
    }
  };

  /**
   * Generate image frame from the video using canvas and store it in data64
   */
  const drawFrame = async (
    width: number,
    height: number,
    page: HTMLCanvasElement,
  ) => {
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
   * Load video from file input
   */
  const handleVideoUpload = (event: Event) => {
    status.value = VIDEO_STATUS.loading;
    const target = event.target as HTMLInputElement;
    const file: File = target.files![0];
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = () => {
      videoSrc.value = String(reader.result);
    };
    reader.onloadend = () => {
      status.value = VIDEO_STATUS.loaded;
      generateFrames();
    };
  };

  /**
   * Load sample video kekeflipnote.mp4
   */
  const loadSampleVideo = async () => {
    status.value = VIDEO_STATUS.loading;

    try {
      // Set the video source
      videoSrc.value = "/kekeflipnote.mp4";
      status.value = VIDEO_STATUS.loaded;

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
      status.value = VIDEO_STATUS.error;
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
        targetFrameTimes.value = calculateTargetFrameTimes(
          videoEl.duration,
          targetFps,
        );

        // Reset video to start and begin capture
        videoEl.currentTime = 0;

        // Calculate optimal playback rate for consistent processing
        videoEl.playbackRate = calculateOptimalPlaybackRate(
          videoEl.duration,
          targetFps,
        );
      });

      videoEl.play();
      videoEl["requestVideoFrameCallback"](getFrame);
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
   * Handle FPS changes - regenerate frames with new FPS
   */
  const handleFpsChange = () => {
    // Only regenerate if we have a video loaded
    if (videoSrc.value && video.value) {
      generateFrames();
    }
  };

  /**
   * Reset all video and frame state
   */
  const resetVideo = () => {
    // Stop any playing animation
    if (playInterval.value) {
      clearInterval(playInterval.value);
      playInterval.value = null;
    }
    isPlaying.value = false;

    status.value = VIDEO_STATUS.empty;
    videoSrc.value = null;
    totalFrames.value = [];
    frames.value = [];
    currentFrameIndex.value = 0;
    videoDuration.value = 0;
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

        // Calculate interval based on playback speed slider
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

  return {
    // State
    fps,
    playbackSpeed,
    currentFrameIndex,
    videoDuration,
    videoSrc,
    video,
    status,
    canvas,
    totalFrames,
    frames,
    videoAspectRatio,
    targetFrameTimes,
    currentTargetIndex,
    isPlaying,

    // Computed
    currentTime,
    totalTime,

    // Methods
    formatTime,
    handleVideoUpload,
    loadSampleVideo,
    generateFrames,
    handleFpsChange,
    resetVideo,
    togglePlay,
    previousFrame,
    nextFrame,

    // Constants
    VIDEO_STATUS,
  };
}
