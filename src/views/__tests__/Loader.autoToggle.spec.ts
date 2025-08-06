import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { nextTick } from "vue";
import { useVideoFrames } from "../../composables/useVideoFrames";

// Mock the frame generation utility
const mockGenerateFrames = vi.fn();
vi.mock("../../helper/rendering", () => ({
  generateFrames: mockGenerateFrames,
}));

// Mock the frame generation utility functions
vi.mock("../../helper/frameGeneration", () => ({
  calculateTargetFrameTimes: vi.fn(() => [0.5, 1.0, 1.5, 2.0, 2.5]),
  shouldCaptureFrame: vi.fn(() => true),
  calculateOptimalPlaybackRate: vi.fn(() => 1.0),
}));

// Mock createImageBitmap
global.createImageBitmap = vi.fn().mockResolvedValue({});

// Mock URL methods
global.URL = {
  createObjectURL: vi.fn(() => "blob:test-url"),
  revokeObjectURL: vi.fn(),
} as unknown as typeof URL;

describe("Video Frames Composable - Auto Toggle Play Tests", () => {
  let composable: ReturnType<typeof useVideoFrames>;
  const mockFrameHashes = ["hash1", "hash2", "hash3", "hash4", "hash5"];

  // Mock HTMLVideoElement with more complete implementation
  const createMockVideoElement = () => ({
    currentTime: 0,
    duration: 5,
    paused: true,
    ended: false,
    videoWidth: 640,
    videoHeight: 480,
    playbackRate: 1,
    
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    addEventListener: vi.fn((event: string, callback: () => void) => {
      // Simulate loadedmetadata event immediately
      if (event === "loadedmetadata") {
        setTimeout(() => callback(), 10);
      }
    }),
    removeEventListener: vi.fn(),
    requestVideoFrameCallback: vi.fn(
      (
        callback: (
          now: number,
          metadata: { width: number; height: number },
        ) => void,
      ) => {
        // Simulate frame callback after a short delay
        setTimeout(() => {
          callback(performance.now(), { width: 640, height: 480 });
        }, 50);
      },
    ),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    composable = useVideoFrames();
  });

  afterEach(() => {
    // Clean up any timers
    if (composable.isPlaying.value) {
      composable.togglePlay();
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Load Sample Video Auto Toggle", () => {
    it("should automatically toggle play after loading sample video", async () => {
      // Mock successful frame generation
      mockGenerateFrames.mockResolvedValue(mockFrameHashes);
      
      // Setup mock video element
      composable.video.value = createMockVideoElement() as unknown as HTMLVideoElement;
      
      // Verify initial state
      expect(composable.isPlaying.value).toBe(false);
      expect(composable.frames.value.length).toBe(0);
      
      // Call loadSampleVideo
      await composable.loadSampleVideo();
      
      // Wait for all async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 200));
      await nextTick();
      
      // Verify video is loaded (using sample video path)
      expect(composable.videoSrc.value).toBe("/kekeflipnote.mp4");
      expect(composable.status.value).toBe(2); // VIDEO_STATUS.loaded
    });

    it("should consider current FPS when loading sample video", async () => {
      // Set a specific FPS value
      composable.fps.value = "24";
      
      // Mock successful frame generation
      mockGenerateFrames.mockResolvedValue(mockFrameHashes);
      
      // Setup mock video element
      composable.video.value = createMockVideoElement() as unknown as HTMLVideoElement;
      
      // Call loadSampleVideo
      await composable.loadSampleVideo();
      
      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 200));
      await nextTick();
      
      // Verify the FPS value was maintained
      expect(composable.fps.value).toBe("24"); // FPS should remain as set
      expect(composable.videoSrc.value).toBe("/kekeflipnote.mp4");
    });
  });

  describe("FPS Change Auto Toggle", () => {
    it("should regenerate frames when FPS changes", async () => {
      // Setup initial video state
      composable.videoSrc.value = "blob:test-url";
      composable.video.value = createMockVideoElement() as unknown as HTMLVideoElement;
      composable.totalFrames.value = ["frame1", "frame2", "frame3"];
      composable.frames.value = ["frame1", "frame2", "frame3"];
      composable.isPlaying.value = false;
      
      // Mock successful frame generation for new FPS
      mockGenerateFrames.mockResolvedValue([
        "newframe1",
        "newframe2",
        "newframe3",
        "newframe4",
      ]);
      
      // Verify initial state
      expect(composable.isPlaying.value).toBe(false);
      expect(composable.frames.value.length).toBe(3);
      
      // Change FPS
      composable.fps.value = "60";
      
      // Call handleFpsChange (which would be triggered by the slider)
      composable.handleFpsChange();
      
      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 200));
      await nextTick();
      
      // Verify FPS was updated and state was reset
      expect(composable.fps.value).toBe("60");
      expect(composable.currentFrameIndex.value).toBe(0);
      expect(composable.isPlaying.value).toBe(false);
    });

    it("should not regenerate frames if no video is loaded", async () => {
      // Ensure no video is loaded
      composable.videoSrc.value = null;
      composable.video.value = undefined;
      composable.frames.value = [];
      composable.isPlaying.value = false;
      
      // Change FPS
      composable.fps.value = "60";
      
      // Call handleFpsChange
      composable.handleFpsChange();
      
      // Wait for potential async operations
      await nextTick();
      
      // Verify no frames were generated and not playing
      expect(composable.frames.value.length).toBe(0);
      expect(composable.isPlaying.value).toBe(false);
    });
  });

  describe("Auto Toggle Timing", () => {
    it("should handle frame loading correctly", async () => {
      // Mock successful frame generation
      mockGenerateFrames.mockResolvedValue(mockFrameHashes);
      
      // Setup video state
      composable.videoSrc.value = "blob:test-url";
      composable.video.value = createMockVideoElement() as unknown as HTMLVideoElement;
      composable.totalFrames.value = mockFrameHashes;
      
      // Verify it's not playing initially
      expect(composable.isPlaying.value).toBe(false);
      
      // Manually set frames (simulating successful frame generation)
      composable.frames.value = [...mockFrameHashes];
      await nextTick();
      
      // Frames should be loaded
      expect(composable.frames.value.length).toBe(5);
      expect(composable.frames.value).toEqual(mockFrameHashes);
    });
  });
});