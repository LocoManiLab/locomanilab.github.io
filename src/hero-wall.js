import { heroWall } from "./hero-wall-data.js?v=20261014-success-replay";

export function enhanceHeroWall() {
  const video = document.querySelector("#hero-wall-video");
  const label = document.querySelector("#hero-wall-group");
  if (!video) return;

  // The source already contains 2× motion; 1.5× playback makes the wall 3×.
  video.defaultPlaybackRate = 1.5;
  video.playbackRate = 1.5;

  // Both groups are encoded on one timeline, so changing groups never needs
  // another video request or an independent playback clock.
  video.dataset.src = heroWall.video;
  video.poster = heroWall.poster;
  const groups = heroWall.groups;
  const groupAt = (time) =>
    Math.max(
      0,
      groups.findLastIndex((group) => time >= group.start),
    );
  const showGroup = (time = video.currentTime) => {
    const index = groupAt(time);
    const number = String(index + 1);
    if (video.dataset.group === number) return;
    video.dataset.group = number;
    if (label) label.textContent = `Group ${number} / ${groups.length}`;
  };
  video.addEventListener("timeupdate", () => showGroup());
  video.addEventListener("seeked", () => showGroup());
  showGroup();

  const stage = video.closest(".hero-wall-stage");
  const canvas = stage?.querySelector(".hero-wall-transition");
  const context = canvas?.getContext("2d", { alpha: false });
  if (!context) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const captureLead = 0.65;
  const fadeSeconds = 0.42;
  const frameCallbacks = typeof video.requestVideoFrameCallback === "function";
  let pendingFrame = null;
  let previousTime = video.currentTime;
  let previousGroup = groupAt(previousTime);
  let capturedGroup = null;
  let fadeStart = null;

  const clearTransition = () => {
    canvas.style.opacity = "0";
    stage.dataset.transition = "idle";
    capturedGroup = null;
    fadeStart = null;
  };
  const stopFrames = () => {
    if (pendingFrame === null) return;
    if (frameCallbacks) video.cancelVideoFrameCallback(pendingFrame);
    else cancelAnimationFrame(pendingFrame);
    pendingFrame = null;
  };

  const renderFrame = (time) => {
    const group = groupAt(time);
    const wrapped = time < previousTime - 0.1;
    if ((group !== previousGroup || wrapped) && capturedGroup === previousGroup)
      fadeStart = groups[group].start;

    if (fadeStart !== null) {
      // Media time freezes both the picture and its fade during buffering/pauses.
      const progress = Math.min(
        1,
        Math.max(0, (time - fadeStart) / (fadeSeconds * video.playbackRate)),
      );
      canvas.style.opacity = String(
        1 - progress * progress * (3 - 2 * progress),
      );
      stage.dataset.transition = "crossfading";
      if (progress === 1) clearTransition();
    } else {
      const end = groups[group + 1]?.start ?? heroWall.duration;
      if (time >= end - captureLead) {
        // Cover the outgoing frames before the cut, including the native loop
        // seek, so no frame of the hard cut can flash through before the fade.
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.style.opacity = "1";
        stage.dataset.transition = "holding";
        capturedGroup = group;
      }
    }
    previousTime = time;
    previousGroup = group;
    showGroup(time);
  };

  const queueFrame = () => {
    if (pendingFrame !== null || video.paused || reducedMotion.matches) return;
    const onFrame = (_now, metadata) => {
      pendingFrame = null;
      if (video.paused || reducedMotion.matches) return;
      if (video.readyState >= 2 && !video.seeking)
        renderFrame(metadata?.mediaTime ?? video.currentTime);
      queueFrame();
    };
    pendingFrame = frameCallbacks
      ? video.requestVideoFrameCallback(onFrame)
      : requestAnimationFrame(onFrame);
  };

  video.addEventListener("playing", queueFrame);
  video.addEventListener("pause", stopFrames);
  video.addEventListener("seeking", () => {
    // Native looping also seeks to zero. Keep its prepared outgoing frame;
    // ordinary scrubbing must never leave a snapshot of an unrelated scene.
    const loopSeek =
      video.loop &&
      capturedGroup === groups.length - 1 &&
      previousTime >= heroWall.duration - captureLead &&
      video.currentTime < captureLead;
    if (!loopSeek) {
      clearTransition();
      previousTime = video.currentTime;
      previousGroup = groupAt(previousTime);
    }
  });
  reducedMotion.addEventListener("change", () => {
    clearTransition();
    if (reducedMotion.matches) stopFrames();
    else queueFrame();
  });
  queueFrame();
}
