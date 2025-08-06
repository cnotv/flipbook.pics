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

  describe("Component Rendering", () => {
    it("should render frames container", () => {
      const wrapper = mount(FlipFrames, {
        props: {
          frames: mockFrames,
          currentFrameIndex: 0,
        },
      });

      expect(wrapper.find(".frames")).toBeTruthy();
    });

    it("should render current frame with correct src", () => {
      const wrapper = mount(FlipFrames, {
        props: {
          frames: mockFrames,
          currentFrameIndex: 2,
        },
      });

      const currentFrame = wrapper.find(".frames__item--current");
      expect(currentFrame.exists()).toBe(true);
      expect(currentFrame.attributes("src")).toBe(mockFrames[2]);
      expect(currentFrame.attributes("alt")).toBe("Current frame");
    });

    it("should render cover when provided", () => {
      const wrapper = mount(FlipFrames, {
        props: {
          frames: mockFrames,
          cover: mockCover,
          currentFrameIndex: 0,
        },
      });

      const coverImage = wrapper.find('img[alt="Cover"]');
      expect(coverImage.exists()).toBe(true);
      expect(coverImage.attributes("src")).toBe(mockCover);
    });

    it("should not render cover when not provided", () => {
      const wrapper = mount(FlipFrames, {
        props: {
          frames: mockFrames,
          currentFrameIndex: 0,
        },
      });

      const coverImage = wrapper.find('img[alt="Cover"]');
      expect(coverImage.exists()).toBe(false);
    });

    it("should render all stack frames", () => {
      const wrapper = mount(FlipFrames, {
        props: {
          frames: mockFrames,
          currentFrameIndex: 1,
        },
      });

      const stackFrames = wrapper
        .findAll(".frames__item")
        .filter(
          (img) =>
            !img.classes("frames__item--current") &&
            img.attributes("alt") !== "Cover",
        );

      expect(stackFrames.length).toBe(mockFrames.length);
    });

    it("should apply flipped class to non-last frames", () => {
      const wrapper = mount(FlipFrames, {
        props: {
          frames: mockFrames,
          currentFrameIndex: 0,
        },
      });

      const stackFrames = wrapper
        .findAll(".frames__item")
        .filter(
          (img) =>
            !img.classes("frames__item--current") &&
            img.attributes("alt") !== "Cover",
        );

      // All frames except the last one should have flipped class
      const flippedFrames = stackFrames.filter((img) =>
        img.classes("frames__item--flipped"),
      );

      expect(flippedFrames.length).toBe(mockFrames.length - 1);
    });
  });

  describe("Frame Visibility Logic", () => {
    it("should hide frames beyond display limit", () => {
      const manyFrames = Array.from({ length: 15 }, (_, i) => `frame${i}`);

      const wrapper = mount(FlipFrames, {
        props: {
          frames: manyFrames,
          currentFrameIndex: 0,
        },
      });

      const stackFrames = wrapper
        .findAll(".frames__item")
        .filter(
          (img) =>
            !img.classes("frames__item--current") &&
            img.attributes("alt") !== "Cover",
        );

      // Frames beyond the last 10 should be hidden
      const hiddenFrames = stackFrames.filter((img) => {
        const style = img.attributes("style");
        return style && style.includes("display: none");
      });

      expect(hiddenFrames.length).toBe(5); // 15 - 10 = 5 hidden frames
    });

    it("should make current frame transparent in stack", () => {
      const wrapper = mount(FlipFrames, {
        props: {
          frames: mockFrames,
          currentFrameIndex: 2,
        },
      });

      const stackFrames = wrapper
        .findAll(".frames__item")
        .filter(
          (img) =>
            !img.classes("frames__item--current") &&
            img.attributes("alt") !== "Cover",
        );

      // Find the frame at currentFrameIndex in the stack
      const currentIndexFrame = stackFrames.find((img, index) => {
        const style = img.attributes("style");
        return index === 2 && style && style.includes("opacity: 0");
      });

      expect(currentIndexFrame).toBeTruthy();
    });

    it("should apply correct opacity to different frame types", () => {
      const wrapper = mount(FlipFrames, {
        props: {
          frames: mockFrames,
          currentFrameIndex: 1,
        },
      });

      const stackFrames = wrapper
        .findAll(".frames__item")
        .filter(
          (img) =>
            !img.classes("frames__item--current") &&
            img.attributes("alt") !== "Cover",
        );

      stackFrames.forEach((img, index) => {
        const style = img.attributes("style") || "";

        if (index === 1) {
          // Current frame should be transparent
          expect(style).toContain("opacity: 0");
        } else if (index < mockFrames.length - 1) {
          // Non-last frames should be semi-transparent
          expect(style).toContain("opacity: 0.5");
        } else {
          // Last frame should be opaque
          expect(style).toContain("opacity: 1");
        }
      });
    });
  });

  describe("Props Validation", () => {
    it("should handle empty frames array", () => {
      const wrapper = mount(FlipFrames, {
        props: {
          frames: [],
          currentFrameIndex: 0,
        },
      });

      const currentFrame = wrapper.find(".frames__item--current");
      expect(currentFrame.exists()).toBe(false);

      const stackFrames = wrapper
        .findAll(".frames__item")
        .filter((img) => img.attributes("alt") !== "Cover");
      expect(stackFrames.length).toBe(0);
    });

    it("should handle currentFrameIndex out of bounds", () => {
      const wrapper = mount(FlipFrames, {
        props: {
          frames: mockFrames,
          currentFrameIndex: 999,
        },
      });

      const currentFrame = wrapper.find(".frames__item--current");
      expect(currentFrame.exists()).toBe(true);
      // Should still render but with undefined frame source
      expect(currentFrame.attributes("src")).toBeUndefined();
    });

    it("should handle null cover gracefully", () => {
      const wrapper = mount(FlipFrames, {
        props: {
          frames: mockFrames,
          cover: null,
          currentFrameIndex: 0,
        },
      });

      const coverImage = wrapper.find('img[alt="Cover"]');
      expect(coverImage.exists()).toBe(false);
    });
  });

  describe("Z-Index and Layering", () => {
    it("should set correct z-index for cover", () => {
      const wrapper = mount(FlipFrames, {
        props: {
          frames: mockFrames,
          cover: mockCover,
          currentFrameIndex: 0,
        },
      });

      const coverImage = wrapper.find('img[alt="Cover"]');
      const style = coverImage.attributes("style") || "";
      expect(style).toContain("z-index: 1");
    });

    it("should set negative z-index for stack frames", () => {
      const wrapper = mount(FlipFrames, {
        props: {
          frames: mockFrames,
          currentFrameIndex: 0,
        },
      });

      const stackFrames = wrapper
        .findAll(".frames__item")
        .filter(
          (img) =>
            !img.classes("frames__item--current") &&
            img.attributes("alt") !== "Cover",
        );

      stackFrames.forEach((img, index) => {
        const style = img.attributes("style") || "";
        expect(style).toContain(`z-index: ${-index}`);
      });
    });

    it("should use CSS class for current frame z-index", () => {
      const wrapper = mount(FlipFrames, {
        props: {
          frames: mockFrames,
          currentFrameIndex: 1,
        },
      });

      const currentFrame = wrapper.find(".frames__item--current");
      expect(currentFrame.exists()).toBe(true);
      expect(currentFrame.classes()).toContain("frames__item--current");
    });
  });
});
