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
   * Initialize video element with mobile-friendly attributes
   */
  const initializeVideoElement = (videoEl: HTMLVideoElement) => {
    // Prevent fullscreen on mobile devices
    videoEl.setAttribute("playsinline", "true");
    videoEl.setAttribute("webkit-playsinline", "true");
    videoEl.muted = true; // Mute to allow autoplay on mobile without user interaction
    videoEl.controls = false; // Hide controls to prevent user interaction
    videoEl.style.display = "none"; // Hide video element
    
    // Prevent context menu on video
    videoEl.addEventListener("contextmenu", (e) => e.preventDefault());
    
    // Prevent video from going fullscreen when double-tapped on mobile
    videoEl.addEventListener("dblclick", (e) => e.preventDefault());
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
   * Set flipbook dimensions
   */
  const setFlipbookSize = async (width: number, height: number) => {
    flipbookWidth.value = width;
    flipbookHeight.value = height;
    // Regenerate frames if we have a video loaded
    if (videoSrc.value && video.value) {
      try {
        await generateFrames();
      } catch (error) {
        console.error("Failed to regenerate frames after size change:", error);
      }
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
  const handleVideoUpload = (event: Event): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Reset existing video and frames before loading new one
      resetVideo();
      
      status.value = VIDEO_STATUS.loading;
      loadingText.value = "Loading video...";
      
      const target = event.target as HTMLInputElement;
      const file: File = target.files![0];
      const reader = new FileReader();

      reader.readAsDataURL(file);
      reader.onload = () => {
        videoSrc.value = String(reader.result);
      };
      reader.onloadend = async () => {
        try {
          status.value = VIDEO_STATUS.loaded;
          await generateFrames();
          resolve();
        } catch (error) {
          status.value = VIDEO_STATUS.error;
          loadingText.value = "";
          reject(error);
        }
      };
      reader.onerror = () => {
        status.value = VIDEO_STATUS.error;
        loadingText.value = "";
        reject(new Error("Failed to read video file"));
      };
    });
  };

  /**
   * Load sample video kekeflipnote.mp4
   */
  const loadSampleVideo = async () => {
    // Reset existing video and frames before loading new one
    resetVideo();
    
    status.value = VIDEO_STATUS.loading;
    loadingText.value = "Loading sample video...";

    try {
      // Set the video source
      videoSrc.value = "/kekeflipnote.mp4";
      status.value = VIDEO_STATUS.loaded;

      // Wait for Vue to update the DOM
      await new Promise((resolve) => setTimeout(resolve, 200));

      const videoEl = video.value;
      if (videoEl) {
        // Initialize video element
        initializeVideoElement(videoEl);
        
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
        await generateFrames();
      }
    } catch (error) {
      status.value = VIDEO_STATUS.error;
      loadingText.value = "";
    }
  };

  // Frame generation completion callback
  let frameGenerationResolver: (() => void) | null = null;

  /**
   * Generate frames from videos from given uploaded video file
   */
  const generateFrames = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      loadingText.value = "Generating frames";
      
      totalFrames.value = [];
      currentTargetIndex.value = 0;
      frameGenerationResolver = resolve;

      const videoEl = video.value;
      if (!videoEl) {
        reject(new Error("Video element not found"));
        return;
      }

      const processVideo = () => {
        try {
          videoAspectRatio.value = videoEl.videoWidth / videoEl.videoHeight;
          videoDuration.value = videoEl.duration;

          // Calculate deterministic frame capture times using utility function
          const targetFps = parseInt(fps.value) || 30;
          targetFrameTimes.value = calculateTargetFrameTimes(
            videoEl.duration,
            targetFps,
          );

          loadingText.value = `Extracting frames for ${targetFps} FPS`;

          // Reset video to start and begin capture
          videoEl.currentTime = 0;

          // Calculate optimal playback rate for consistent processing
          videoEl.playbackRate = calculateOptimalPlaybackRate(
            videoEl.duration,
            targetFps,
          );

          // Ensure video can play and start frame capture
          const playPromise = videoEl.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                videoEl["requestVideoFrameCallback"](getFrame);
              })
              .catch((error) => {
                console.error("Video play failed:", error);
                frameGenerationResolver = null;
                reject(new Error("Failed to start video playback"));
              });
          } else {
            videoEl["requestVideoFrameCallback"](getFrame);
          }
        } catch (error) {
          frameGenerationResolver = null;
          reject(error);
        }
      };

      // Check if metadata is already loaded
      if (videoEl.readyState >= 1) {
        // HAVE_METADATA or higher
        processVideo();
      } else {
        const handleMetadata = () => {
          videoEl.removeEventListener("loadedmetadata", handleMetadata);
          videoEl.removeEventListener("error", handleError);
          processVideo();
        };

        const handleError = (_error: Event) => {
          videoEl.removeEventListener("loadedmetadata", handleMetadata);
          videoEl.removeEventListener("error", handleError);
          frameGenerationResolver = null;
          reject(new Error("Failed to load video metadata"));
        };

        videoEl.addEventListener("loadedmetadata", handleMetadata);
        videoEl.addEventListener("error", handleError);
      }
    });
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
    loadingText.value = "Ready";

    // Automatically start playing after frames are generated
    if (frames.value.length > 0) {
      setTimeout(() => {
        loadingText.value = "";
        togglePlay();
        
        // Resolve the promise if we have a resolver
        if (frameGenerationResolver) {
          frameGenerationResolver();
          frameGenerationResolver = null;
        }
      }, 100);
    } else {
      // Resolve immediately if no frames were generated
      if (frameGenerationResolver) {
        frameGenerationResolver();
        frameGenerationResolver = null;
      }
    }
  };

  /**
   * Handle FPS changes - regenerate frames with new FPS
   */
  const handleFpsChange = async () => {
    // Only regenerate if we have a video loaded
    if (videoSrc.value && video.value) {
      try {
        await generateFrames();
      } catch (error) {
        console.error("Failed to regenerate frames:", error);
        status.value = VIDEO_STATUS.error;
        loadingText.value = "";
      }
    }
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
  };
}
