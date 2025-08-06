import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import Loader from '../Loader.vue';

// Mock the frame generation utility
const mockGenerateFrames = vi.fn();
vi.mock('../../helper/rendering', () => ({
  generateFrames: mockGenerateFrames,
}));

describe('Loader Component - Simple Integration Tests', () => {
  let wrapper: any;
  const mockFrameHashes = [
    'hash1', 'hash2', 'hash3', 'hash4', 'hash5', 'hash6'
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock HTMLVideoElement methods
    Object.defineProperty(global, 'HTMLVideoElement', {
      writable: true,
      value: class MockHTMLVideoElement {
        currentTime = 0;
        duration = 5;
        paused = true;
        videoWidth = 640;
        videoHeight = 480;
        
        play = vi.fn().mockResolvedValue(undefined);
        pause = vi.fn();
        load = vi.fn();
        addEventListener = vi.fn();
        removeEventListener = vi.fn();
        requestVideoFrameCallback = vi.fn();
        getVideoPlaybackQuality = vi.fn(() => ({ droppedVideoFrames: 0 }));
      }
    });

    // Mock createElement to return our mock video element
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'video') {
        const video = new (global as any).HTMLVideoElement();
        return video as any;
      }
      return document.createElement.call(document, tagName);
    });

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

  describe('Video Loading and Frame Generation', () => {
    it('should generate frames when video state is set', async () => {
      // Mock successful frame generation
      mockGenerateFrames.mockResolvedValue(mockFrameHashes);
      
      // Directly set the video state without DOM manipulation
      await wrapper.setData({
        videoFile: new File(['mock'], 'test.mp4', { type: 'video/mp4' }),
        videoSrc: 'blob:test-url',
        videoLoaded: true,
        duration: 5
      });
      
      await nextTick();
      
      // Manually trigger the frame generation effect
      await wrapper.vm.generateFramesFromVideo();
      await nextTick();
      
      expect(wrapper.vm.frames.length).toBeGreaterThan(0);
      expect(wrapper.vm.isPlaying).toBe(true);
    });

    it('should handle sample video loading', async () => {
      // Mock successful frame generation
      mockGenerateFrames.mockResolvedValue(mockFrameHashes);
      
      // Directly call the sample video method
      await wrapper.vm.loadSampleVideo();
      await nextTick();
      
      expect(wrapper.vm.videoFile).toBeTruthy();
      expect(wrapper.vm.videoSrc).toBeTruthy();
      expect(wrapper.vm.videoLoaded).toBe(true);
      expect(wrapper.vm.frames.length).toBeGreaterThan(0);
      expect(wrapper.vm.isPlaying).toBe(true);
    });

    it('should regenerate frames when FPS changes', async () => {
      // Setup initial state
      mockGenerateFrames.mockResolvedValue(mockFrameHashes);
      
      await wrapper.setData({
        videoFile: new File(['mock'], 'test.mp4', { type: 'video/mp4' }),
        videoSrc: 'blob:test-url',
        videoLoaded: true,
        frames: ['initial1', 'initial2'],
        duration: 5
      });
      
      const initialFrameCount = wrapper.vm.frames.length;
      
      // Change FPS
      await wrapper.setData({ fps: 24 });
      await nextTick();
      
      // Should trigger regeneration
      expect(mockGenerateFrames).toHaveBeenCalled();
    });
  });

  describe('Automatic Toggle Play After Loading', () => {
    it('should automatically start playing after frames are generated', async () => {
      mockGenerateFrames.mockResolvedValue(mockFrameHashes);
      
      // Set up video loaded state
      await wrapper.setData({
        videoFile: new File(['mock'], 'test.mp4', { type: 'video/mp4' }),
        videoLoaded: true,
        frames: mockFrameHashes,
        duration: 5
      });
      
      await nextTick();
      
      expect(wrapper.vm.isPlaying).toBe(true);
    });
  });
});
