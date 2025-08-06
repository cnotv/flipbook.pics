import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import Loader from '../Loader.vue';

// Mock the frame generation utility
const mockGenerateFrames = vi.fn();
vi.mock('../../helper/rendering', () => ({
  generateFrames: mockGenerateFrames,
}));

// Mock the frame generation utility functions
vi.mock('../../helper/frameGeneration', () => ({
  calculateTargetFrameTimes: vi.fn(() => [0.5, 1.0, 1.5, 2.0, 2.5]),
  shouldCaptureFrame: vi.fn(() => true),
  calculateOptimalPlaybackRate: vi.fn(() => 1.0),
}));

describe('Loader Component - Auto Toggle Play Tests', () => {
  let wrapper: any;
  const mockFrameHashes = [
    'hash1', 'hash2', 'hash3', 'hash4', 'hash5'
  ];

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
    addEventListener: vi.fn((event: string, callback: Function) => {
      // Simulate loadedmetadata event immediately
      if (event === 'loadedmetadata') {
        setTimeout(() => callback(), 10);
      }
    }),
    removeEventListener: vi.fn(),
    requestVideoFrameCallback: vi.fn((callback: Function) => {
      // Simulate frame callback after a short delay
      setTimeout(() => {
        callback(performance.now(), { width: 640, height: 480 });
      }, 50);
    }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock HTMLVideoElement
    Object.defineProperty(global, 'HTMLVideoElement', {
      writable: true,
      value: class MockHTMLVideoElement {
        constructor() {
          return createMockVideoElement();
        }
      }
    });

    // Mock createElement to return our mock video element
    const originalCreateElement = document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'video') {
        return createMockVideoElement() as any;
      }
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => ({
            clearRect: vi.fn(),
            drawImage: vi.fn(),
          })),
          toDataURL: vi.fn(() => 'data:image/jpeg;base64,mockdata'),
        } as any;
      }
      return originalCreateElement.call(document, tagName);
    });

    // Mock createImageBitmap
    (global as any).createImageBitmap = vi.fn().mockResolvedValue({});

    // Mock URL methods
    (global as any).URL = {
      createObjectURL: vi.fn(() => 'blob:test-url'),
      revokeObjectURL: vi.fn()
    };

    wrapper = mount(Loader);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  describe('Load Sample Video Auto Toggle', () => {
    it('should automatically toggle play after loading sample video', async () => {
      // Mock successful frame generation
      mockGenerateFrames.mockResolvedValue(mockFrameHashes);
      
      // Verify initial state
      expect(wrapper.vm.isPlaying).toBe(false);
      expect(wrapper.vm.frames.length).toBe(0);
      
      // Call loadSampleVideo
      await wrapper.vm.loadSampleVideo();
      
      // Wait for all async operations to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      await nextTick();
      
      // Verify frames were generated and playing started automatically
      expect(wrapper.vm.frames.length).toBeGreaterThan(0);
      expect(wrapper.vm.isPlaying).toBe(true);
    });

    it('should consider current FPS when loading sample video', async () => {
      // Set a specific FPS value
      await wrapper.setData({ fps: '24' });
      
      // Mock successful frame generation
      mockGenerateFrames.mockResolvedValue(mockFrameHashes);
      
      // Call loadSampleVideo
      await wrapper.vm.loadSampleVideo();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 200));
      await nextTick();
      
      // Verify the FPS value was considered (frames generated)
      expect(wrapper.vm.frames.length).toBeGreaterThan(0);
      expect(wrapper.vm.fps).toBe('24'); // FPS should remain as set
    });
  });

  describe('FPS Change Auto Toggle', () => {
    it('should regenerate frames and auto-toggle when FPS changes', async () => {
      // Setup initial video state
      await wrapper.setData({
        videoSrc: 'blob:test-url',
        totalFrames: ['frame1', 'frame2', 'frame3'],
        frames: ['frame1', 'frame2', 'frame3'],
        isPlaying: false
      });
      
      // Mock successful frame generation for new FPS
      mockGenerateFrames.mockResolvedValue(['newframe1', 'newframe2', 'newframe3', 'newframe4']);
      
      // Verify initial state
      expect(wrapper.vm.isPlaying).toBe(false);
      expect(wrapper.vm.frames.length).toBe(3);
      
      // Change FPS
      await wrapper.setData({ fps: '60' });
      
      // Call handleFpsChange (which would be triggered by the slider)
      await wrapper.vm.handleFpsChange();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 200));
      await nextTick();
      
      // Verify frames were regenerated and playing started
      expect(wrapper.vm.frames.length).toBeGreaterThan(0);
      expect(wrapper.vm.isPlaying).toBe(true);
    });

    it('should not regenerate frames if no video is loaded', async () => {
      // Ensure no video is loaded
      await wrapper.setData({
        videoSrc: null,
        frames: [],
        isPlaying: false
      });
      
      // Change FPS
      await wrapper.setData({ fps: '60' });
      
      // Call handleFpsChange
      await wrapper.vm.handleFpsChange();
      
      // Wait for potential async operations
      await nextTick();
      
      // Verify no frames were generated and not playing
      expect(wrapper.vm.frames.length).toBe(0);
      expect(wrapper.vm.isPlaying).toBe(false);
    });
  });

  describe('Auto Toggle Timing', () => {
    it('should have correct timing for auto toggle', async () => {
      // Mock successful frame generation
      mockGenerateFrames.mockResolvedValue(mockFrameHashes);
      
      // Setup video state
      await wrapper.setData({
        videoSrc: 'blob:test-url',
        totalFrames: mockFrameHashes
      });
      
      // Call updateFrames
      wrapper.vm.updateFrames();
      
      // Verify it's not playing immediately
      expect(wrapper.vm.isPlaying).toBe(false);
      
      // Wait for the setTimeout delay (100ms)
      await new Promise(resolve => setTimeout(resolve, 150));
      await nextTick();
      
      // Should be playing after the delay
      expect(wrapper.vm.isPlaying).toBe(true);
    });
  });
});
