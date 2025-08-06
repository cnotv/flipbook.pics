/**
 * Utility functions for deterministic frame generation
 */

/**
 * Calculate target frame times based on FPS and video duration
 * This ensures consistent frame capture regardless of how many times it's called
 */
export function calculateTargetFrameTimes(
  videoDurationSeconds: number,
  targetFps: number
): number[] {
  if (videoDurationSeconds <= 0 || targetFps <= 0) {
    return [];
  }

  const frameInterval = 1 / targetFps; // Time between frames in seconds
  const totalFramesToCapture = Math.floor(videoDurationSeconds * targetFps);
  
  const targetTimes: number[] = [];
  for (let i = 0; i < totalFramesToCapture; i++) {
    // Round to 3 decimal places to avoid floating point precision issues
    targetTimes.push(Math.round(i * frameInterval * 1000) / 1000);
  }
  
  return targetTimes;
}

/**
 * Determine if a frame should be captured at the current video time
 */
export function shouldCaptureFrame(
  currentVideoTime: number,
  targetTimes: number[],
  currentTargetIndex: number
): boolean {
  if (currentTargetIndex >= targetTimes.length) {
    return false;
  }
  
  const targetTime = targetTimes[currentTargetIndex];
  return currentVideoTime >= targetTime;
}

/**
 * Calculate the optimal playback rate for consistent frame capture
 * Stays within browser-supported range (0.25 - 4.0)
 */
export function calculateOptimalPlaybackRate(
  videoDurationSeconds: number,
  targetFps: number
): number {
  // Base rate that works well for most scenarios
  const baseRate = 2.0;
  
  // Small adjustments based on duration and FPS
  const durationFactor = Math.min(videoDurationSeconds / 30, 1.0); // Cap at 1.0x
  const fpsFactor = Math.min(targetFps / 60, 1.0); // Cap at 1.0x
  
  // Calculate rate with small adjustments
  const calculatedRate = baseRate + durationFactor * 0.5 + fpsFactor * 0.5;
  
  // Clamp to browser-safe range (0.5 - 4.0)
  return Math.max(0.5, Math.min(4.0, calculatedRate));
}

/**
 * Generate a deterministic hash of frame capture parameters
 * Used to verify that the same parameters always produce the same result
 */
export function generateFrameParametersHash(
  videoDurationSeconds: number,
  targetFps: number
): string {
  const roundedDuration = Math.round(videoDurationSeconds * 1000) / 1000;
  const data = `${roundedDuration}-${targetFps}`;
  
  // Simple hash function for testing purposes
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}
