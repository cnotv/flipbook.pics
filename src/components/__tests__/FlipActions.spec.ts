import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import FlipActions from "../FlipActions.vue";

describe("FlipActions", () => {
  const defaultProps = {
    frames: [],
    isPlaying: false,
    currentFrameIndex: 0,
    currentTime: "00:00",
    totalTime: "00:00",
    cover: null,
  };

  it("renders correctly with default props", () => {
    const wrapper = mount(FlipActions, {
      props: defaultProps,
    });

    expect(wrapper.find(".actions").exists()).toBe(true);
    expect(wrapper.findAll(".flip-button")).toHaveLength(4); // Reset, Play, Print, + Cover
  });

  it("displays correct play/pause button text", async () => {
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, isPlaying: false },
    });

    expect(wrapper.findAll(".flip-button")[1].text()).toBe("▶");

    await wrapper.setProps({ isPlaying: true });
    expect(wrapper.findAll(".flip-button")[1].text()).toBe("⏸");
  });

  it("disables play and print buttons when no frames", () => {
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, frames: [] },
    });

    const buttons = wrapper.findAll(".flip-button");
    expect(buttons[1].attributes("disabled")).toBeDefined(); // Play button
    expect(buttons[2].attributes("disabled")).toBeDefined(); // Print button
  });

  it("enables play and print buttons when frames are available", () => {
    const frames = ["frame1", "frame2"];
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, frames },
    });

    const buttons = wrapper.findAll(".flip-button");
    expect(buttons[1].attributes("disabled")).toBeUndefined(); // Play button
    expect(buttons[2].attributes("disabled")).toBeUndefined(); // Print button
  });

  it("shows frame navigation when frames are available", () => {
    const frames = ["frame1", "frame2", "frame3"];
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, frames, currentFrameIndex: 1 },
    });

    expect(wrapper.find(".frame-navigation").exists()).toBe(true);
    expect(wrapper.find(".frame-count").text()).toBe("2 / 3");
  });

  it("hides frame navigation when no frames", () => {
    const wrapper = mount(FlipActions, {
      props: defaultProps,
    });

    expect(wrapper.find(".frame-navigation").exists()).toBe(false);
  });

  it("disables previous button on first frame", () => {
    const frames = ["frame1", "frame2"];
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, frames, currentFrameIndex: 0 },
    });

    const navButtons = wrapper
      .find(".frame-navigation")
      .findAll(".flip-button");
    expect(navButtons[0].attributes("disabled")).toBeDefined(); // Previous button
    expect(navButtons[1].attributes("disabled")).toBeUndefined(); // Next button
  });

  it("disables next button on last frame", () => {
    const frames = ["frame1", "frame2"];
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, frames, currentFrameIndex: 1 },
    });

    const navButtons = wrapper
      .find(".frame-navigation")
      .findAll(".flip-button");
    expect(navButtons[0].attributes("disabled")).toBeUndefined(); // Previous button
    expect(navButtons[1].attributes("disabled")).toBeDefined(); // Next button
  });

  it("shows time display in frame navigation", () => {
    const frames = ["frame1", "frame2"];
    const wrapper = mount(FlipActions, {
      props: {
        ...defaultProps,
        frames,
        currentTime: "01:30",
        totalTime: "05:00",
      },
    });

    expect(wrapper.find(".time-display").text()).toBe("01:30 / 05:00");
  });

  it("shows cover upload button when no cover", () => {
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, cover: null },
    });

    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("+ Cover");
  });

  it("shows remove cover button when cover exists", () => {
    const mockCover = "data:image/png;base64,test";
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, cover: mockCover },
    });

    expect(wrapper.find('input[type="file"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("- Cover");
  });

  it("emits reset event when reset button clicked", async () => {
    const wrapper = mount(FlipActions, {
      props: defaultProps,
    });

    await wrapper.findAll(".flip-button")[0].trigger("click");
    expect(wrapper.emitted("reset")).toHaveLength(1);
  });

  it("emits togglePlay event when play button clicked", async () => {
    const frames = ["frame1", "frame2"]; // Need frames to enable play button
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, frames },
    });

    await wrapper.findAll(".flip-button")[1].trigger("click");
    expect(wrapper.emitted("togglePlay")).toHaveLength(1);
  });

  it("emits print event when print button clicked", async () => {
    const frames = ["frame1", "frame2"]; // Need frames to enable print button
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, frames },
    });

    await wrapper.findAll(".flip-button")[2].trigger("click");
    expect(wrapper.emitted("print")).toHaveLength(1);
  });

  it("emits previousFrame event when previous button clicked", async () => {
    const frames = ["frame1", "frame2"];
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, frames, currentFrameIndex: 1 },
    });

    const navButtons = wrapper
      .find(".frame-navigation")
      .findAll(".flip-button");
    await navButtons[0].trigger("click");
    expect(wrapper.emitted("previousFrame")).toHaveLength(1);
  });

  it("emits nextFrame event when next button clicked", async () => {
    const frames = ["frame1", "frame2"];
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, frames, currentFrameIndex: 0 },
    });

    const navButtons = wrapper
      .find(".frame-navigation")
      .findAll(".flip-button");
    await navButtons[1].trigger("click");
    expect(wrapper.emitted("nextFrame")).toHaveLength(1);
  });

  it("emits coverUpload event when cover file is selected", async () => {
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, cover: null },
    });

    const fileInput = wrapper.find('input[type="file"]');
    await fileInput.trigger("change");
    expect(wrapper.emitted("coverUpload")).toHaveLength(1);
  });

  it("emits removeCover event when remove cover button clicked", async () => {
    const mockCover = "data:image/png;base64,test";
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, cover: mockCover },
    });

    await wrapper.findAll(".flip-button")[3].trigger("click"); // Remove cover button (4th button)
    expect(wrapper.emitted("removeCover")).toHaveLength(1);
  });

  it("shows cover upload button when no cover exists", async () => {
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, cover: null },
    });

    const coverButton = wrapper.findAll(".flip-button")[3]; // Cover upload button (4th button)
    expect(coverButton.text()).toBe("+ Cover");
    
    // Test that the button can be clicked without errors
    await coverButton.trigger("click");
  });

  it("applies correct CSS classes", () => {
    const frames = ["frame1", "frame2"];
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, frames },
    });

    expect(wrapper.find(".actions").exists()).toBe(true);
    expect(wrapper.find(".frame-navigation").exists()).toBe(true);
    expect(wrapper.find(".frame-counter").exists()).toBe(true);
    expect(wrapper.find(".frame-count").exists()).toBe(true);
    expect(wrapper.find(".time-display").exists()).toBe(true);
  });

  it("handles edge case with single frame", () => {
    const frames = ["frame1"];
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, frames, currentFrameIndex: 0 },
    });

    const navButtons = wrapper
      .find(".frame-navigation")
      .findAll(".flip-button");
    expect(navButtons[0].attributes("disabled")).toBeDefined(); // Previous disabled
    expect(navButtons[1].attributes("disabled")).toBeDefined(); // Next disabled
    expect(wrapper.find(".frame-count").text()).toBe("1 / 1");
  });

  it("handles zero frames correctly", () => {
    const wrapper = mount(FlipActions, {
      props: { ...defaultProps, frames: [] },
    });

    expect(wrapper.find(".frame-navigation").exists()).toBe(false);

    const buttons = wrapper.findAll(".flip-button");
    expect(buttons[1].attributes("disabled")).toBeDefined(); // Play disabled when no frames
    expect(buttons[2].attributes("disabled")).toBeDefined(); // Print disabled when no frames
  });
});
