import { describe, it, expect } from "vitest";
import {
  calculateTargetFrameTimes,
  shouldCaptureFrame,
  calculateOptimalPlaybackRate,
  generateFrameParametersHash,
} from "../frameGeneration";

describe("Frame Generation Utilities", () => {
  describe("calculateTargetFrameTimes", () => {
    it("should generate consistent frame times for the same parameters", () => {
      const duration = 10.5; // 10.5 seconds
      const fps = 30;

      // Run the function multiple times with same parameters
      const result1 = calculateTargetFrameTimes(duration, fps);
      const result2 = calculateTargetFrameTimes(duration, fps);
      const result3 = calculateTargetFrameTimes(duration, fps);

      // All results should be identical
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
      expect(result1.length).toBe(result2.length);
      expect(result2.length).toBe(result3.length);
    });

    it("should calculate correct number of frames", () => {
      const duration = 5.0; // 5 seconds
      const fps = 24;

      const result = calculateTargetFrameTimes(duration, fps);
      
      // Should generate 5 * 24 = 120 frames
      expect(result.length).toBe(120);
    });

    it("should generate frames at correct intervals", () => {
      const duration = 2.0; // 2 seconds
      const fps = 10; // 10 FPS

      const result = calculateTargetFrameTimes(duration, fps);
      
      // Should have frames at 0.0, 0.1, 0.2, ..., 1.9 seconds
      expect(result.length).toBe(20);
      expect(result[0]).toBe(0.0);
      expect(result[1]).toBe(0.1);
      expect(result[10]).toBe(1.0);
      expect(result[19]).toBe(1.9);
    });

    it("should handle edge cases", () => {
      // Zero duration
      expect(calculateTargetFrameTimes(0, 30)).toEqual([]);
      
      // Zero FPS
      expect(calculateTargetFrameTimes(10, 0)).toEqual([]);
      
      // Negative values
      expect(calculateTargetFrameTimes(-5, 30)).toEqual([]);
      expect(calculateTargetFrameTimes(5, -30)).toEqual([]);
    });

    it("should round frame times to avoid floating point issues", () => {
      const duration = 1.0;
      const fps = 3; // 1/3 = 0.333... seconds interval

      const result = calculateTargetFrameTimes(duration, fps);
      
      // Check that times are properly rounded
      expect(result[0]).toBe(0.0);
      expect(result[1]).toBe(0.333); // Should be rounded to 3 decimal places
      expect(result[2]).toBe(0.667);
    });
  });

  describe("shouldCaptureFrame", () => {
    it("should determine frame capture correctly", () => {
      const targetTimes = [0.0, 0.5, 1.0, 1.5, 2.0];
      
      // Should capture at exact target times
      expect(shouldCaptureFrame(0.0, targetTimes, 0)).toBe(true);
      expect(shouldCaptureFrame(0.5, targetTimes, 1)).toBe(true);
      expect(shouldCaptureFrame(1.0, targetTimes, 2)).toBe(true);
      
      // Should capture when current time exceeds target
      expect(shouldCaptureFrame(0.6, targetTimes, 1)).toBe(true);
      expect(shouldCaptureFrame(1.1, targetTimes, 2)).toBe(true);
      
      // Should not capture when before target time
      expect(shouldCaptureFrame(0.4, targetTimes, 1)).toBe(false);
      expect(shouldCaptureFrame(0.9, targetTimes, 2)).toBe(false);
      
      // Should not capture when index is out of bounds
      expect(shouldCaptureFrame(2.5, targetTimes, 5)).toBe(false);
      expect(shouldCaptureFrame(3.0, targetTimes, 10)).toBe(false);
    });

    it("should handle empty target times array", () => {
      expect(shouldCaptureFrame(1.0, [], 0)).toBe(false);
    });
  });

  describe("calculateOptimalPlaybackRate", () => {
    it("should return consistent playback rates for same parameters", () => {
      const duration = 15.5;
      const fps = 25;

      const rate1 = calculateOptimalPlaybackRate(duration, fps);
      const rate2 = calculateOptimalPlaybackRate(duration, fps);
      const rate3 = calculateOptimalPlaybackRate(duration, fps);

      expect(rate1).toBe(rate2);
      expect(rate2).toBe(rate3);
    });

    it("should return browser-safe playback rates", () => {
      // Short video, low FPS
      const rate1 = calculateOptimalPlaybackRate(2.0, 15);
      expect(rate1).toBeGreaterThanOrEqual(0.5);
      expect(rate1).toBeLessThanOrEqual(4.0);

      // Long video, high FPS
      const rate2 = calculateOptimalPlaybackRate(60.0, 60);
      expect(rate2).toBeGreaterThanOrEqual(0.5);
      expect(rate2).toBeLessThanOrEqual(4.0);
      
      // Very long video, very high FPS - should still be clamped
      const rate3 = calculateOptimalPlaybackRate(120.0, 120);
      expect(rate3).toBeGreaterThanOrEqual(0.5);
      expect(rate3).toBeLessThanOrEqual(4.0);
    });

    it("should handle edge cases", () => {
      // Should not crash with extreme values and stay within range
      const rate1 = calculateOptimalPlaybackRate(0, 30);
      expect(rate1).toBeGreaterThanOrEqual(0.5);
      expect(rate1).toBeLessThanOrEqual(4.0);
      
      const rate2 = calculateOptimalPlaybackRate(1000, 120);
      expect(rate2).toBeGreaterThanOrEqual(0.5);
      expect(rate2).toBeLessThanOrEqual(4.0);
      
      const rate3 = calculateOptimalPlaybackRate(-5, 30);
      expect(rate3).toBeGreaterThanOrEqual(0.5);
      expect(rate3).toBeLessThanOrEqual(4.0);
    });
  });

  describe("generateFrameParametersHash", () => {
    it("should generate identical hashes for identical parameters", () => {
      const duration = 12.345;
      const fps = 29;

      const hash1 = generateFrameParametersHash(duration, fps);
      const hash2 = generateFrameParametersHash(duration, fps);
      const hash3 = generateFrameParametersHash(duration, fps);

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
      expect(hash1.length).toBeGreaterThan(0);
    });

    it("should generate different hashes for different parameters", () => {
      const hash1 = generateFrameParametersHash(10.0, 30);
      const hash2 = generateFrameParametersHash(10.0, 24);
      const hash3 = generateFrameParametersHash(15.0, 30);

      expect(hash1).not.toBe(hash2);
      expect(hash2).not.toBe(hash3);
      expect(hash1).not.toBe(hash3);
    });

    it("should handle floating point precision consistently", () => {
      // Very similar but not identical durations
      const hash1 = generateFrameParametersHash(10.123456789, 30);
      const hash2 = generateFrameParametersHash(10.123456789, 30);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe("Deterministic Frame Generation Integration", () => {
    it("should produce identical frame time arrays for repeated calls", () => {
      const testCases = [
        { duration: 5.5, fps: 24 },
        { duration: 10.0, fps: 30 },
        { duration: 2.3, fps: 60 },
        { duration: 0.5, fps: 15 },
      ];

      testCases.forEach(({ duration, fps }) => {
        // Generate frame times multiple times
        const runs = Array.from({ length: 5 }, () => 
          calculateTargetFrameTimes(duration, fps)
        );

        // All runs should produce identical results
        for (let i = 1; i < runs.length; i++) {
          expect(runs[i]).toEqual(runs[0]);
          expect(runs[i].length).toBe(runs[0].length);
          
          // Check each frame time individually
          for (let j = 0; j < runs[i].length; j++) {
            expect(runs[i][j]).toBe(runs[0][j]);
          }
        }
      });
    });

    it("should produce identical hashes for identical video parameters", () => {
      const testCases = [
        { duration: 8.75, fps: 25 },
        { duration: 15.333, fps: 29 },
        { duration: 3.14159, fps: 48 },
      ];

      testCases.forEach(({ duration, fps }) => {
        // Generate hashes multiple times
        const hashes = Array.from({ length: 10 }, () => 
          generateFrameParametersHash(duration, fps)
        );

        // All hashes should be identical
        const firstHash = hashes[0];
        hashes.forEach((hash) => {
          expect(hash).toBe(firstHash);
        });
      });
    });

    it("should demonstrate frame capture determinism", () => {
      const duration = 3.0;
      const fps = 10;
      
      // Generate target times
      const targetTimes = calculateTargetFrameTimes(duration, fps);
      
      // Simulate video playback at various times
      const videoClock = [0.0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 0.6, 1.0, 1.1, 1.5, 2.0, 2.5, 3.0];
      
      // Track which frames should be captured
      let captureIndex = 0;
      const capturedFrames: number[] = [];
      
      videoClock.forEach((currentTime) => {
        if (shouldCaptureFrame(currentTime, targetTimes, captureIndex)) {
          capturedFrames.push(currentTime);
          captureIndex++;
        }
      });
      
      // Should capture exactly at the expected times
      expect(capturedFrames.length).toBeGreaterThan(0);
      expect(capturedFrames.length).toBeLessThanOrEqual(targetTimes.length);
      
      // Each captured frame should correspond to reaching a target time
      capturedFrames.forEach((captureTime, index) => {
        if (index < targetTimes.length) {
          expect(captureTime).toBeGreaterThanOrEqual(targetTimes[index]);
        }
      });
    });
  });
});
