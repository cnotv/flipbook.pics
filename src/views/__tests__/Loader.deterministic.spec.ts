import { describe, it, expect, beforeEach, vi } from "vitest";
import { 
  calculateTargetFrameTimes, 
  generateFrameParametersHash 
} from "../../helper/frameGeneration";

// Mock the video element and its methods
const createMockVideo = (duration: number = 10.0, width: number = 1920, height: number = 1080) => ({
  duration,
  videoWidth: width,
  videoHeight: height,
  currentTime: 0,
  playbackRate: 1,
  ended: false,
  play: vi.fn().mockResolvedValue(undefined),
  load: vi.fn(),
  addEventListener: vi.fn((event: string, callback: Function) => {
    if (event === "loadedmetadata") {
      // Simulate metadata loading immediately
      setTimeout(callback, 0);
    }
  }),
  removeEventListener: vi.fn(),
  requestVideoFrameCallback: vi.fn((callback: Function) => {
    // Simulate frame callback
    setTimeout(() => {
      callback(performance.now(), {
        width,
        height,
      });
    }, 16); // ~60fps simulation
  }),
});

// Mock canvas methods
const createMockCanvas = () => ({
  width: 0,
  height: 0,
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
  })),
  toDataURL: vi.fn(() => "data:image/jpeg;base64,mockImageData"),
});

// Mock createImageBitmap
global.createImageBitmap = vi.fn().mockResolvedValue({});

describe("Loader Component - Deterministic Frame Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate identical frame parameters for repeated operations", () => {
    const duration = 8.5;
    const fps = 24;

    // Generate target times multiple times
    const results = Array.from({ length: 5 }, () => 
      calculateTargetFrameTimes(duration, fps)
    );

    // All results should be identical
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(results[0]);
      expect(results[i].length).toBe(results[0].length);
    }

    // Generate hashes multiple times
    const hashes = Array.from({ length: 5 }, () => 
      generateFrameParametersHash(duration, fps)
    );

    // All hashes should be identical
    const firstHash = hashes[0];
    hashes.forEach(hash => {
      expect(hash).toBe(firstHash);
    });
  });

  it("should produce different results for different FPS settings", () => {
    const duration = 5.0;
    const fps1 = 24;
    const fps2 = 30;

    const frames1 = calculateTargetFrameTimes(duration, fps1);
    const frames2 = calculateTargetFrameTimes(duration, fps2);

    // Different FPS should produce different frame counts
    expect(frames1.length).not.toBe(frames2.length);
    expect(frames1.length).toBe(120); // 5 * 24
    expect(frames2.length).toBe(150); // 5 * 30

    // Hashes should be different
    const hash1 = generateFrameParametersHash(duration, fps1);
    const hash2 = generateFrameParametersHash(duration, fps2);
    expect(hash1).not.toBe(hash2);
  });

  it("should calculate correct frame intervals for various FPS values", () => {
    const testCases = [
      { duration: 2.0, fps: 10, expectedFrames: 20, expectedInterval: 0.1 },
      { duration: 1.0, fps: 24, expectedFrames: 24, expectedInterval: 1/24 },
      { duration: 3.0, fps: 30, expectedFrames: 90, expectedInterval: 1/30 },
      { duration: 0.5, fps: 60, expectedFrames: 30, expectedInterval: 1/60 },
    ];

    testCases.forEach(({ duration, fps, expectedFrames, expectedInterval }) => {
      const frames = calculateTargetFrameTimes(duration, fps);
      
      expect(frames.length).toBe(expectedFrames);
      
      if (frames.length > 1) {
        // Check interval between consecutive frames (rounded to handle floating point)
        const actualInterval = Math.round((frames[1] - frames[0]) * 1000) / 1000;
        const roundedExpectedInterval = Math.round(expectedInterval * 1000) / 1000;
        expect(actualInterval).toBe(roundedExpectedInterval);
      }
    });
  });

  it("should demonstrate frame time precision and consistency", () => {
    const duration = 1.0;
    const fps = 3; // Will create 1/3 second intervals

    const frames = calculateTargetFrameTimes(duration, fps);
    
    expect(frames.length).toBe(3);
    expect(frames[0]).toBe(0.0);
    expect(frames[1]).toBe(0.333); // Rounded to 3 decimal places
    expect(frames[2]).toBe(0.667); // Rounded to 3 decimal places

    // Verify that running multiple times produces identical results
    for (let i = 0; i < 10; i++) {
      const newFrames = calculateTargetFrameTimes(duration, fps);
      expect(newFrames).toEqual(frames);
    }
  });

  it("should handle edge cases in frame generation", () => {
    // Very short duration
    const shortFrames = calculateTargetFrameTimes(0.1, 30);
    expect(shortFrames.length).toBe(3); // 0.1 * 30 = 3 frames

    // Very long duration
    const longFrames = calculateTargetFrameTimes(60.0, 24);
    expect(longFrames.length).toBe(1440); // 60 * 24 = 1440 frames

    // High FPS
    const highFpsFrames = calculateTargetFrameTimes(1.0, 120);
    expect(highFpsFrames.length).toBe(120);

    // Low FPS
    const lowFpsFrames = calculateTargetFrameTimes(2.0, 5);
    expect(lowFpsFrames.length).toBe(10);

    // Verify all are deterministic
    [shortFrames, longFrames, highFpsFrames, lowFpsFrames].forEach(frames => {
      const duplicate = calculateTargetFrameTimes(
        frames.length === 3 ? 0.1 : 
        frames.length === 1440 ? 60.0 :
        frames.length === 120 ? 1.0 : 2.0,
        frames.length === 3 ? 30 :
        frames.length === 1440 ? 24 :
        frames.length === 120 ? 120 : 5
      );
      expect(duplicate).toEqual(frames);
    });
  });

  it("should generate consistent hashes for floating point durations", () => {
    const testCases = [
      { duration: 5.123456789, fps: 29 },
      { duration: 10.987654321, fps: 25 },
      { duration: 3.141592653, fps: 60 },
    ];

    testCases.forEach(({ duration, fps }) => {
      // Generate hash multiple times
      const hashes = Array.from({ length: 10 }, () => 
        generateFrameParametersHash(duration, fps)
      );

      // All should be identical
      const firstHash = hashes[0];
      hashes.forEach(hash => {
        expect(hash).toBe(firstHash);
        expect(typeof hash).toBe("string");
        expect(hash.length).toBeGreaterThan(0);
      });
    });
  });

  it("should verify that frame generation is truly deterministic across multiple runs", () => {
    // Test with various realistic video scenarios
    const scenarios = [
      { name: "Short clip", duration: 3.5, fps: 24 },
      { name: "Medium video", duration: 15.7, fps: 30 },
      { name: "Long video", duration: 45.2, fps: 25 },
      { name: "High FPS", duration: 5.0, fps: 60 },
    ];

    scenarios.forEach(({ name, duration, fps }) => {
      // Run frame generation 20 times
      const results = Array.from({ length: 20 }, () => ({
        frames: calculateTargetFrameTimes(duration, fps),
        hash: generateFrameParametersHash(duration, fps),
      }));

      // Verify all runs produced identical results
      const firstResult = results[0];
      results.forEach((result, index) => {
        expect(result.frames).toEqual(firstResult.frames);
        expect(result.hash).toBe(firstResult.hash);
        expect(result.frames.length).toBe(firstResult.frames.length);

        // Check each individual frame time
        result.frames.forEach((frameTime, frameIndex) => {
          expect(frameTime).toBe(firstResult.frames[frameIndex]);
        });
      });

      console.log(`✓ ${name}: ${firstResult.frames.length} frames, hash: ${firstResult.hash}`);
    });
  });
});
