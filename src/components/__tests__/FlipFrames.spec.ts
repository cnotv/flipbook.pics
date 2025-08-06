import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import FlipFrames from "../FlipFrames.vue";

describe("FlipFrames Component", () => {
  const mockFrames = [
    "data:image/jpeg;base64,frame1",
    "data:image/jpeg;base64,frame2",
    "data:image/jpeg;base64,frame3",
    "data:image/jpeg;base64,frame4",
  ];

  const mockCover = "data:image/jpeg;base64,cover";

  // Mock LOADING_STATUS constant
  const LOADING_STATUS = {
    idle: 0,
    loadingVideo: 1,
    generatingFrames: 2,
    extractingFrames: 3,
    ready: 4,
  };

  // Helper function to create default props
  const createDefaultProps = (overrides = {}) => ({
    frames: mockFrames,
    currentFrameIndex: 0,
    loadingStatus: LOADING_STATUS.idle,
    loadingText: "",
    LOADING_STATUS,
    ...overrides,
  });

  describe("Component Rendering", () => {
    it("should render frames container", () => {
      const wrapper = mount(FlipFrames, {
        props: createDefaultProps(),
      });

      expect(wrapper.find(".frames")).toBeTruthy();
    });

    it("should render current frame with correct src", () => {
      const wrapper = mount(FlipFrames, {
        props: createDefaultProps({
          currentFrameIndex: 2,
        }),
      });

      const currentFrame = wrapper.find(".frames__item--current");
      expect(currentFrame.exists()).toBe(true);
      expect(currentFrame.attributes("src")).toBe(mockFrames[2]);
    });

    it("should render cover when provided", () => {
      const wrapper = mount(FlipFrames, {
        props: createDefaultProps({
          cover: mockCover,
        }),
      });

      const coverElement = wrapper.find('img[alt="Cover"]');
      expect(coverElement.exists()).toBe(true);
      expect(coverElement.attributes("src")).toBe(mockCover);
    });

    it("should render stack frames", () => {
      const wrapper = mount(FlipFrames, {
        props: createDefaultProps(),
      });

      const stackFrames = wrapper.findAll(".frames__item");
      expect(stackFrames.length).toBeGreaterThan(0);
    });
  });

  describe("Loading Status Display", () => {
    it("should show loading overlay when loading status is not idle", () => {
      const wrapper = mount(FlipFrames, {
        props: createDefaultProps({
          loadingStatus: LOADING_STATUS.loadingVideo,
          loadingText: "Loading video...",
        }),
      });

      const overlay = wrapper.find(".frames__loading-overlay");
      expect(overlay.exists()).toBe(true);
    });

    it("should hide loading overlay when loading status is idle", () => {
      const wrapper = mount(FlipFrames, {
        props: createDefaultProps({
          loadingStatus: LOADING_STATUS.idle,
        }),
      });

      const overlay = wrapper.find(".frames__loading-overlay");
      expect(overlay.exists()).toBe(false);
    });

    it("should display loading text", () => {
      const testText = "Generating frames...";
      const wrapper = mount(FlipFrames, {
        props: createDefaultProps({
          loadingStatus: LOADING_STATUS.generatingFrames,
          loadingText: testText,
        }),
      });

      expect(wrapper.text()).toContain(testText);
    });

    it("should show correct status icon for loading video", () => {
      const wrapper = mount(FlipFrames, {
        props: createDefaultProps({
          loadingStatus: LOADING_STATUS.loadingVideo,
        }),
      });

      expect(wrapper.text()).toContain("📹 Loading video...");
    });

    it("should show correct status icon for generating frames", () => {
      const wrapper = mount(FlipFrames, {
        props: createDefaultProps({
          loadingStatus: LOADING_STATUS.generatingFrames,
        }),
      });

      expect(wrapper.text()).toContain("⚙️ Generating frames...");
    });

    it("should show correct status icon for extracting frames", () => {
      const wrapper = mount(FlipFrames, {
        props: createDefaultProps({
          loadingStatus: LOADING_STATUS.extractingFrames,
        }),
      });

      expect(wrapper.text()).toContain("🎞️ Extracting frames...");
    });

    it("should show correct status icon for ready", () => {
      const wrapper = mount(FlipFrames, {
        props: createDefaultProps({
          loadingStatus: LOADING_STATUS.ready,
        }),
      });

      expect(wrapper.text()).toContain("✅ Ready!");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty frames array", () => {
      const wrapper = mount(FlipFrames, {
        props: createDefaultProps({
          frames: [],
        }),
      });

      const currentFrame = wrapper.find(".frames__item--current");
      expect(currentFrame.exists()).toBe(false);
    });

    it("should handle null cover", () => {
      const wrapper = mount(FlipFrames, {
        props: createDefaultProps({
          cover: null,
        }),
      });

      const coverElement = wrapper.find('img[alt="Cover"]');
      expect(coverElement.exists()).toBe(false);
    });
  });
});
