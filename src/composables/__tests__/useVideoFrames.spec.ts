import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { useVideoFrames } from "../useVideoFrames";

// Mock the frame generation helper functions
vi.mock("../../helper/frameGeneration", () => ({
  calculateTargetFrameTimes: vi
    .fn()
    .mockReturnValue([0, 0.033, 0.066, 0.1, 0.133]), // 30 FPS for ~0.15 seconds
  shouldCaptureFrame: vi.fn().mockReturnValue(true),
  calculateOptimalPlaybackRate: vi.fn().mockReturnValue(1.0),
}));

// Mock createImageBitmap
global.createImageBitmap = vi.fn().mockResolvedValue({
  width: 1920,
  height: 1080,
});

// Mock HTMLVideoElement
const mockVideo = {
  duration: 10.5,
  videoWidth: 1920,
  videoHeight: 1080,
  currentTime: 0,
  ended: false,
  load: vi.fn(),
  play: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  requestVideoFrameCallback: vi.fn(),
  playbackRate: 1,
};

describe("useVideoFrames Composable", () => {
  let composable: ReturnType<typeof useVideoFrames>;

  beforeEach(() => {
    vi.clearAllMocks();
    composable = useVideoFrames();
  });

  afterEach(() => {
    // Clean up any timers
    if (composable.isPlaying.value && composable.togglePlay) {
      composable.togglePlay();
    }
    vi.useRealTimers();
  });

  describe("Initial State", () => {
    it("should have correct default values", () => {
      expect(composable.fps.value).toBe("30");
      expect(composable.playbackSpeed.value).toBe("0");
      expect(composable.currentFrameIndex.value).toBe(0);
      expect(composable.videoDuration.value).toBe(0);
      expect(composable.videoSrc.value).toBe(undefined);
      expect(composable.status.value).toBe(0); // VIDEO_STATUS.empty
      expect(composable.totalFrames.value).toEqual([]);
      expect(composable.frames.value).toEqual([]);
      expect(composable.videoAspectRatio.value).toBe(1.7777777777777777); // 16/9
      expect(composable.isPlaying.value).toBe(false);
    });

    it("should initialize computed properties correctly", () => {
      expect(composable.currentTime.value).toBe("0:00.000");
      expect(composable.totalTime.value).toBe("0:00.000");
    });
  });

  describe("Time Formatting", () => {
    it("should format time correctly", () => {
      expect(composable.formatTime(0)).toBe("0:00.000");
      expect(composable.formatTime(65.123)).toBe("1:05.123");
      expect(composable.formatTime(125.456)).toBe("2:05.456");
      expect(composable.formatTime(3661.789)).toBe("61:01.789");
    });

    it("should handle edge cases", () => {
      expect(composable.formatTime(0.999)).toBe("0:00.999");
      expect(composable.formatTime(59.999)).toBe("0:59.999");
      expect(composable.formatTime(60.0)).toBe("1:00.000");
    });
  });

  describe("Computed Time Properties", () => {
    it("should calculate total time from duration", async () => {
      composable.videoDuration.value = 65.5;
      await nextTick();
      expect(composable.totalTime.value).toBe("1:05.500");
    });

    it("should calculate current time based on frame position", async () => {
      // Setup test data
      composable.frames.value = ["frame1", "frame2", "frame3", "frame4"];
      composable.videoDuration.value = 6.0;
      composable.currentFrameIndex.value = 1;
      await nextTick();

      // Expected: (1 / (4-1)) * 6.0 = 2.0 seconds
      expect(composable.currentTime.value).toBe("0:02.000");
    });

    it("should return zero time when no frames or duration", async () => {
      composable.frames.value = [];
      composable.videoDuration.value = 0;
      await nextTick();
      expect(composable.currentTime.value).toBe("0:00.000");
    });
  });

  describe("Animation Control", () => {
    it("should start and stop playback correctly", async () => {
      vi.useFakeTimers();
      
      // Setup frames
      composable.frames.value = ["frame1", "frame2", "frame3"];
      composable.playbackSpeed.value = "0";

      // Start playing
      composable.togglePlay();
      await nextTick();
      expect(composable.isPlaying.value).toBe(true);

      // Stop playing
      composable.togglePlay();
      await nextTick();
      expect(composable.isPlaying.value).toBe(false);

      vi.useRealTimers();
    });

    it("should advance frames during playback", async () => {
      vi.useFakeTimers();
      
      composable.frames.value = ["frame1", "frame2", "frame3"];
      composable.currentFrameIndex.value = 0;
      composable.playbackSpeed.value = "0";

      composable.togglePlay();
      await nextTick();

      // Advance timer
      vi.advanceTimersByTime(100);
      await nextTick();

      expect(composable.currentFrameIndex.value).toBe(1);

      vi.useRealTimers();
    });

    it("should loop frames at the end", async () => {
      vi.useFakeTimers();
      
      composable.frames.value = ["frame1", "frame2", "frame3"];
      composable.currentFrameIndex.value = 2; // Last frame
      composable.playbackSpeed.value = "0";

      composable.togglePlay();
      await nextTick();

      vi.advanceTimersByTime(100);
      await nextTick();

      expect(composable.currentFrameIndex.value).toBe(0); // Should loop back

      vi.useRealTimers();
    });
  });

  describe("Frame Navigation", () => {
    beforeEach(() => {
      composable.frames.value = ["frame1", "frame2", "frame3", "frame4"];
    });

    it("should navigate to next frame", () => {
      composable.currentFrameIndex.value = 1;
      composable.nextFrame();
      expect(composable.currentFrameIndex.value).toBe(2);
      expect(composable.isPlaying.value).toBe(false); // Should stop playing
    });

    it("should navigate to previous frame", () => {
      composable.currentFrameIndex.value = 2;
      composable.previousFrame();
      expect(composable.currentFrameIndex.value).toBe(1);
      expect(composable.isPlaying.value).toBe(false); // Should stop playing
    });

    it("should respect frame boundaries", () => {
      // Test at last frame
      composable.currentFrameIndex.value = 3;
      composable.nextFrame();
      expect(composable.currentFrameIndex.value).toBe(3); // Should not exceed

      // Test at first frame
      composable.currentFrameIndex.value = 0;
      composable.previousFrame();
      expect(composable.currentFrameIndex.value).toBe(0); // Should not go below
    });
  });

  describe("Video Upload Handling", () => {
    it("should handle video upload event", () => {
      const mockFile = new File(["mock video"], "test.mp4", {
        type: "video/mp4",
      });
      const mockEvent = {
        target: {
          files: [mockFile],
        },
      } as unknown as Event;

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onload: null as
          | ((this: FileReader, ev: ProgressEvent<FileReader>) => void)
          | null,
        onloadend: null as
          | ((this: FileReader, ev: ProgressEvent<FileReader>) => void)
          | null,
        result: "data:video/mp4;base64,mockVideoData",
      };
      
      global.FileReader = vi.fn(
        () => mockFileReader,
      ) as unknown as typeof FileReader;

      composable.handleVideoUpload(mockEvent);
      
      expect(composable.status.value).toBe(1); // VIDEO_STATUS.loading
      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockFile);
    });
  });

  describe("Sample Video Loading", () => {
    it("should load sample video", async () => {
      // Mock video element
      composable.video.value = mockVideo as unknown as HTMLVideoElement;

      const loadPromise = composable.loadSampleVideo();
      
      expect(composable.status.value).toBe(1); // VIDEO_STATUS.loading
      expect(composable.videoSrc.value).toBe("/kekeflipnote.mp4");

      await loadPromise;
      expect(composable.status.value).toBe(2); // VIDEO_STATUS.loaded
    });

    it("should handle sample video loading error", async () => {
      composable.video.value = undefined;

      await composable.loadSampleVideo();
      
      expect(composable.status.value).toBe(3); // VIDEO_STATUS.error
    });
  });

  describe("Frame Generation", () => {
    it("should reset frames when generating", () => {
      composable.totalFrames.value = ["oldFrame1", "oldFrame2"];
      composable.video.value = mockVideo as unknown as HTMLVideoElement;

      composable.generateFrames();

      expect(composable.totalFrames.value).toEqual([]);
      expect(composable.currentTargetIndex.value).toBe(0);
    });

    it("should handle FPS changes", () => {
      composable.videoSrc.value = "/test.mp4";
      composable.video.value = mockVideo as unknown as HTMLVideoElement;
      const generateFramesSpy = vi.spyOn(composable, "generateFrames");

      composable.handleFpsChange();

      expect(generateFramesSpy).toHaveBeenCalled();
    });

    it("should not generate frames without video", () => {
      composable.videoSrc.value = null;
      composable.video.value = undefined;
      const generateFramesSpy = vi.spyOn(composable, "generateFrames");

      composable.handleFpsChange();

      expect(generateFramesSpy).not.toHaveBeenCalled();
    });
  });

  describe("Reset Functionality", () => {
    it("should reset all state", async () => {
      // Setup state
      composable.videoSrc.value = "/test.mp4";
      composable.status.value = 2; // VIDEO_STATUS.loaded
      composable.totalFrames.value = ["frame1", "frame2"];
      composable.frames.value = ["frame1", "frame2"];
      composable.currentFrameIndex.value = 1;
      composable.videoDuration.value = 10.5;
      composable.isPlaying.value = true;

      composable.resetVideo();

      expect(composable.status.value).toBe(0); // VIDEO_STATUS.empty
      expect(composable.videoSrc.value).toBe(null);
      expect(composable.totalFrames.value).toEqual([]);
      expect(composable.frames.value).toEqual([]);
      expect(composable.currentFrameIndex.value).toBe(0);
      expect(composable.videoDuration.value).toBe(0);
      expect(composable.isPlaying.value).toBe(false);
      expect(composable.targetFrameTimes.value).toEqual([]);
      expect(composable.currentTargetIndex.value).toBe(0);
    });
  });

  describe("Constants", () => {
    it("should export VIDEO_STATUS constants", () => {
      expect(composable.VIDEO_STATUS).toBeDefined();
      expect(composable.VIDEO_STATUS.empty).toBe(0);
      expect(composable.VIDEO_STATUS.loading).toBe(1);
      expect(composable.VIDEO_STATUS.loaded).toBe(2);
      expect(composable.VIDEO_STATUS.error).toBe(3);
    });
  });

  describe("Playback Speed Watcher", () => {
    it("should update animation interval when playback speed changes", async () => {
      vi.useFakeTimers();
      
      composable.frames.value = ["frame1", "frame2", "frame3"];
      composable.playbackSpeed.value = "0";
      
      // Start playing
      composable.togglePlay();
      await nextTick();
      
      // Change speed
      composable.playbackSpeed.value = "1";
      await nextTick();
      
      // The watcher should have updated the interval
      expect(composable.isPlaying.value).toBe(true);
      
      vi.useRealTimers();
    });
  });
});
