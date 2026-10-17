const timelineSelector =
  "#episode-seek, #composition-seek, #generated-seek, .sim2real-seek, .shared-media-seek";
const managedVideoSelector = "#open-space-video, #rollout-video";
const clock = (value) => {
  const seconds = Number.isFinite(value) ? Math.max(0, value) : 0;
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
};
const icons = {
  play: '<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="4"/>',
  fullscreen: '<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;

let initialized = false;

/** Unify existing timelines and enhance dynamically inserted standalone players. */
export function enhanceMediaControls() {
  if (initialized) return;
  initialized = true;
  const timelines = new Set();
  const players = new Map();
  let frame = 0;

  function visible(element) {
    if (!element.isConnected || !element.getClientRects().length) return false;
    const rect = element.getBoundingClientRect();
    return rect.bottom >= 0 && rect.top <= innerHeight;
  }

  function paintTimeline(input) {
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const value = Number(input.value) || 0;
    const percent =
      max > min
        ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
        : 0;
    const progress = `${percent.toFixed(3)}%`;
    if (input.style.getPropertyValue("--media-progress") !== progress)
      input.style.setProperty("--media-progress", progress);
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(refresh);
  }

  function updatePlayer(record) {
    const { video, controls, play, seek, time } = record;
    // The original modules still own source selection and their large Play buttons.
    if (video.controls) video.controls = false;
    const hasSource = Boolean(
      video.getAttribute("src")?.trim() || video.querySelector("source[src]"),
    );
    controls.hidden = !hasSource;
    if (!hasSource) record.scrubbing = false;
    const duration =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : 0;
    const current = duration ? Math.min(duration, video.currentTime || 0) : 0;
    const disabled = !duration || Boolean(video.error);
    if (seek.disabled !== disabled) seek.disabled = disabled;
    if (!record.scrubbing)
      seek.value = String(
        duration ? Math.round((current / duration) * 1000) : 0,
      );
    const displayed = record.scrubbing
      ? (Number(seek.value) / 1000) * duration
      : current;
    const valueText = `${clock(displayed)} of ${clock(duration)}`;
    if (seek.getAttribute("aria-valuetext") !== valueText)
      seek.setAttribute("aria-valuetext", valueText);
    const timeText = `${clock(displayed)} / ${clock(duration)}`;
    if (time.textContent !== timeText) time.textContent = timeText;
    const playing = !video.paused && !video.ended;
    const label = `${playing ? "Pause" : "Play"} ${record.name}`;
    if (play.getAttribute("aria-label") !== label) {
      play.setAttribute("aria-label", label);
      play.title = label;
      play.innerHTML = icon(playing ? "pause" : "play");
    }
    paintTimeline(seek);
  }

  function refresh() {
    frame = 0;
    for (const input of timelines) {
      if (!input.isConnected) timelines.delete(input);
      else paintTimeline(input);
    }
    for (const [video, record] of players) {
      if (!video.isConnected) {
        players.delete(video);
        continue;
      }
      updatePlayer(record);
    }
    if (
      !document.hidden &&
      [...document.querySelectorAll("video")].some(
        (video) => !video.paused && !video.ended && visible(video),
      )
    )
      schedule();
  }

  function attachPlayer(video) {
    if (players.has(video)) return;
    const stage = video.parentElement;
    const shell = document.createElement("div");
    shell.className = "shared-media-player";
    shell.dataset.mediaFor = video.id;
    stage.before(shell);
    shell.append(stage);
    const controls = document.createElement("div");
    controls.className = "shared-media-controls";
    controls.hidden = true;
    const name = video.id === "rollout-video" ? "rollout" : "comparison";
    controls.setAttribute("role", "group");
    controls.setAttribute(
      "aria-label",
      `${name === "rollout" ? "Policy rollout" : "Motion comparison"} playback controls`,
    );
    controls.innerHTML = `
      <button type="button" class="shared-media-play" aria-label="Play ${name}" title="Play ${name}">${icon("play")}</button>
      <input class="shared-media-seek" type="range" min="0" max="1000" step="1" value="0" aria-label="${name === "rollout" ? "Policy rollout" : "Motion comparison"} timeline" aria-controls="${video.id}" disabled>
      <output class="shared-media-time" aria-live="off">0:00 / 0:00</output>
      <button type="button" class="shared-media-fullscreen" aria-label="Full screen ${name}" title="Full screen ${name}">${icon("fullscreen")}</button>
      <span class="sr-only shared-media-status" role="status" aria-live="polite"></span>`;
    shell.append(controls);
    const play = controls.querySelector(".shared-media-play");
    const seek = controls.querySelector("input");
    const time = controls.querySelector("output");
    const status = controls.querySelector(".shared-media-status");
    const fullscreen = controls.querySelector(".shared-media-fullscreen");
    const record = {
      video,
      controls,
      play,
      seek,
      time,
      name,
      scrubbing: false,
    };
    players.set(video, record);
    timelines.add(seek);
    video.dataset.sharedMedia = "true";
    play.addEventListener("click", async () => {
      status.textContent = "";
      if (!video.paused && !video.ended) video.pause();
      else {
        if (video.ended) video.currentTime = 0;
        try {
          await video.play();
        } catch {
          status.textContent =
            "Playback could not start. Select Play to try again.";
        }
      }
      schedule();
    });
    seek.addEventListener("pointerdown", () => {
      record.scrubbing = true;
    });
    for (const event of ["pointerup", "pointercancel", "change", "blur"])
      seek.addEventListener(event, () => {
        record.scrubbing = false;
        schedule();
      });
    seek.addEventListener("input", () => {
      if (!seek.disabled && Number.isFinite(video.duration)) {
        video.currentTime = Math.min(
          video.duration,
          Math.max(0, (Number(seek.value) / 1000) * video.duration),
        );
        status.textContent = "";
      }
      paintTimeline(seek);
      schedule();
    });
    fullscreen.hidden = !(
      shell.requestFullscreen || video.webkitEnterFullscreen
    );
    fullscreen.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (shell.requestFullscreen) await shell.requestFullscreen();
        else video.webkitEnterFullscreen?.();
      } catch {
        status.textContent = "Full screen is unavailable in this browser.";
      }
    });
    updatePlayer(record);
  }

  function discover(root = document) {
    if (root.matches?.(timelineSelector)) timelines.add(root);
    root
      .querySelectorAll?.(timelineSelector)
      .forEach((input) => timelines.add(input));
    if (root.matches?.(managedVideoSelector)) attachPlayer(root);
    root.querySelectorAll?.(managedVideoSelector).forEach(attachPlayer);
    root.querySelectorAll?.(".overview-steps button").forEach((button) => {
      if (button.querySelector(".media-tour-track")) return;
      const track = document.createElement("span");
      track.className = "media-tour-track";
      track.setAttribute("aria-hidden", "true");
      track.append(document.createElement("span"));
      button.append(track);
    });
  }

  const observer = new MutationObserver((mutations) => {
    let changed = false;
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes)
          if (node.nodeType === Node.ELEMENT_NODE) discover(node);
        changed ||=
          mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
      } else if (mutation.target.matches?.(managedVideoSelector)) {
        const record = players.get(mutation.target);
        if (record) updatePlayer(record);
        changed = true;
      } else if (mutation.target.matches?.(timelineSelector)) {
        paintTimeline(mutation.target);
      }
    }
    if (changed) schedule();
  });
  discover();
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [
      "src",
      "controls",
      "min",
      "max",
      "value",
      "disabled",
      "aria-valuetext",
    ],
  });
  for (const event of ["input", "change"])
    document.addEventListener(
      event,
      (event) => {
        if (event.target.matches?.(timelineSelector)) {
          paintTimeline(event.target);
          schedule();
        }
      },
      true,
    );
  for (const event of [
    "play",
    "pause",
    "timeupdate",
    "loadedmetadata",
    "durationchange",
    "seeking",
    "seeked",
    "ended",
    "emptied",
    "error",
  ])
    document.addEventListener(
      event,
      (event) => {
        if (event.target instanceof HTMLMediaElement) schedule();
      },
      true,
    );
  for (const event of ["scroll", "resize"])
    window.addEventListener(event, schedule, { passive: true });
  document.addEventListener("visibilitychange", schedule);
  schedule();
}
