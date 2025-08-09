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

enum LOADING_STATUS {
  idle,
  loadingVideo,
  generatingFrames,
  extractingFrames,
  ready,
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
  const loadingStatus = ref(LOADING_STATUS.idle);
  const loadingText = ref("");
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

  // Flipbook size state (default to landscape classic size)
  const flipbookWidth = ref(6); // inches - landscape orientation
  const flipbookHeight = ref(4); // inches

  /**
   * Set flipbook dimensions
   */
  const setFlipbookSize = (width: number, height: number) => {
    flipbookWidth.value = width;
    flipbookHeight.value = height;
    // Regenerate frames if we have a video loaded
    if (videoSrc.value && video.value) {
      generateFrames();
    }
  };

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
    frameWidth?: number,
    frameHeight?: number,
  ) => {
    const bitmap = await createImageBitmap(video.value!);

    // Calculate frame dimensions based on flipbook size
    // Use a consistent scale: 1 inch = 96 pixels (CSS standard)
    const pixelsPerInch = 96;
    const targetFrameWidth = frameWidth || flipbookWidth.value * pixelsPerInch;
    const targetFrameHeight =
      frameHeight || flipbookHeight.value * pixelsPerInch;

    page.width = targetFrameWidth;
    page.height = targetFrameHeight;

    const ctx = page.getContext("2d");
    if (ctx) {
      // Clear canvas
      ctx.clearRect(0, 0, targetFrameWidth, targetFrameHeight);

      // Calculate aspect ratios
      const videoAspect = width / height;
      const flipbookAspect = targetFrameWidth / targetFrameHeight;

      let sourceX = 0,
        sourceY = 0,
        sourceWidth = width,
        sourceHeight = height;

      // Crop video to match flipbook aspect ratio (crop by overflow)
      if (videoAspect > flipbookAspect) {
        // Video is wider than flipbook - crop sides
        sourceWidth = height * flipbookAspect;
        sourceX = (width - sourceWidth) / 2;
      } else {
        // Video is taller than flipbook - crop top/bottom
        sourceHeight = width / flipbookAspect;
        sourceY = (height - sourceHeight) / 2;
      }

      // Draw the cropped video to fill the entire flipbook frame
      ctx.drawImage(
        bitmap,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetFrameWidth,
        targetFrameHeight,
      );

      const image = page.toDataURL("image/jpeg", 0.9);
      totalFrames.value.push(image);
    }
  };

  /**
   * Load video from file input
   */
  const handleVideoUpload = (event: Event) => {
    status.value = VIDEO_STATUS.loading;
    loadingStatus.value = LOADING_STATUS.loadingVideo;
    loadingText.value = "Setting loading status with text";
    
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
    loadingStatus.value = LOADING_STATUS.loadingVideo;
    loadingText.value = "Setting loading status with text";

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
      loadingStatus.value = LOADING_STATUS.idle;
      loadingText.value = "";
    }
  };

  /**
   * Generate frames from videos from given uploaded video file
   */
  const generateFrames = () => {
    loadingStatus.value = LOADING_STATUS.generatingFrames;
    loadingText.value = "Generating frames";
    
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

        loadingStatus.value = LOADING_STATUS.extractingFrames;
        loadingText.value = `Extracting frames for ${targetFps} FPS`;

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

    // Set status to ready
    loadingStatus.value = LOADING_STATUS.ready;
    loadingText.value = "Setting status ready";

    // Automatically start playing after frames are generated
    if (frames.value.length > 0) {
      setTimeout(() => {
        loadingStatus.value = LOADING_STATUS.idle;
        loadingText.value = "";
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
    loadingStatus.value = LOADING_STATUS.idle;
    loadingText.value = "";
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

  /**
   * Set frame position directly
   */
  const setFramePosition = (index: number) => {
    // Stop playing when manually navigating
    if (playInterval.value) {
      clearInterval(playInterval.value);
      playInterval.value = null;
    }
    isPlaying.value = false;

    // Ensure index is within valid range
    if (index >= 0 && index < frames.value.length) {
      currentFrameIndex.value = index;
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
    loadingStatus,
    loadingText,
    canvas,
    totalFrames,
    frames,
    videoAspectRatio,
    targetFrameTimes,
    currentTargetIndex,
    isPlaying,
    flipbookWidth,
    flipbookHeight,

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
    setFramePosition,
    setFlipbookSize,

    // Constants
    VIDEO_STATUS,
    LOADING_STATUS,
  };
}
