import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { nextTick } from "vue";
import { useVideoFrames } from "../../composables/useVideoFrames";

// Mock the frame generation utility
vi.mock("../../helper/frameGeneration", () => ({
  calculateTargetFrameTimes: vi.fn().mockReturnValue([0, 0.5, 1.0, 1.5, 2.0]),
  shouldCaptureFrame: vi.fn().mockReturnValue(true),
  calculateOptimalPlaybackRate: vi.fn().mockReturnValue(1.0),
}));

// Mock createImageBitmap
global.createImageBitmap = vi.fn().mockResolvedValue({
  width: 640,
  height: 480,
});

describe("Video Frames Composable - Simple Integration Tests", () => {
  let composable: ReturnType<typeof useVideoFrames>;
  const MOCK_FRAMES = [
    "frame1",
    "frame2",
    "frame3",
    "frame4",
    "frame5",
    "frame6",
  ];
  const MOCK_VIDEO_DURATION = 5.0;
  const MOCK_FPS = 30;

  // Mock HTMLVideoElement
  const mockVideo = {
    duration: MOCK_VIDEO_DURATION,
    videoWidth: 640,
    videoHeight: 480,
    currentTime: 0,
    ended: false,
    load: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn((event: string, callback: () => void) => {
      if (event === "loadedmetadata") {
        // Simulate metadata loaded
        setTimeout(callback, 0);
      }
    }),
    removeEventListener: vi.fn(),
    requestVideoFrameCallback: vi.fn(),
    playbackRate: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    composable = useVideoFrames();
  });

  afterEach(() => {
    // Clean up any timers
    if (composable.isPlaying.value) {
      composable.togglePlay();
    }
    vi.useRealTimers();
  });

  describe("Video Loading and Frame Generation", () => {
    it("should generate frames when video state is set", async () => {
      // Setup video
      composable.video.value = mockVideo as unknown as HTMLVideoElement;
      composable.videoSrc.value = "blob:test-url";
      composable.fps.value = MOCK_FPS.toString();
      
      // Simulate frames being generated
      composable.totalFrames.value = MOCK_FRAMES;
      
      // Generate frames
      composable.generateFrames();
      await nextTick();
      
      expect(composable.totalFrames.value).toEqual([]);
      expect(composable.currentTargetIndex.value).toBe(0);
    });

    it("should handle sample video loading", async () => {
      composable.video.value = mockVideo as unknown as HTMLVideoElement;
      
      await composable.loadSampleVideo();
      
      expect(composable.status.value).toBe(2); // VIDEO_STATUS.loaded
      expect(composable.videoSrc.value).toBe("/kekeflipnote.mp4");
    });

    it("should regenerate frames when FPS changes", async () => {
      // Setup initial state
      composable.videoSrc.value = "blob:test-url";
      composable.video.value = mockVideo as unknown as HTMLVideoElement;
      composable.frames.value = ["initial1", "initial2"];
      
      const generateFramesSpy = vi.spyOn(composable, "generateFrames");
      
      // Change FPS and trigger update
      composable.fps.value = "24";
      composable.handleFpsChange();
      
      expect(generateFramesSpy).toHaveBeenCalled();
    });
  });

  describe("Automatic Toggle Play After Loading", () => {
    it("should automatically start playing after frames are generated", async () => {
      vi.useFakeTimers();
      
      // Setup frames
      composable.frames.value = MOCK_FRAMES;
      composable.videoDuration.value = MOCK_VIDEO_DURATION;
      
      // Simulate updateFrames being called after generation
      composable.frames.value = [...MOCK_FRAMES];
      composable.currentFrameIndex.value = 0;
      
      // Start playing (auto-toggle after loading)
      composable.togglePlay();
      await nextTick();
      
      expect(composable.isPlaying.value).toBe(true);
      
      vi.useRealTimers();
    });
  });
});
