import { episodes } from "./recordings-data.js?v=20261014-success";
import { setMediaPoster } from "./media-loading.js";

const clock = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function enhanceComposition() {
  const pair = document.querySelector("#composition-pair");
  if (!pair || pair.dataset.enhanced) return;
  const episode = episodes.find((item) => item.id === pair.dataset.episode);
  if (!episode) return;
  pair.dataset.enhanced = "true";
  const disclosure = pair.closest("details");
  const videos = [...pair.querySelectorAll("video")];
  const [master, companion] = videos;
  const play = document.querySelector("#composition-play");
  const replay = document.querySelector("#composition-replay");
  const seek = document.querySelector("#composition-seek");
  const time = document.querySelector("#composition-time");
  const status = document.querySelector("#composition-status");
  let intent = false;
  let started = false;
  let buffering = false;
  let generation = 0;
  let frame;
  let targetTime = 0;
  let visible = false;
  let userPaused = false;
  let autoplayFailed = false;
  let sharedPaused =
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    navigator.connection?.saveData === true ||
    document.readyState !== "complete";

  function syncAutoplay() {
    if (
      visible &&
      disclosure.open &&
      !document.hidden &&
      !sharedPaused &&
      !userPaused &&
      !autoplayFailed &&
      !intent
    )
      start();
  }

  function updateTime() {
    const current = master.readyState ? master.currentTime : targetTime;
    seek.value = String(current);
    seek.setAttribute(
      "aria-valuetext",
      `${clock(current)} of ${clock(episode.duration)}`,
    );
    time.textContent = `${clock(current)} / ${clock(episode.duration)}`;
  }

  function publish() {
    const changed = pair.dataset.playing !== String(intent);
    pair.dataset.playing = String(intent);
    const label = intent ? "Pause both views" : "Play both views";
    play.setAttribute("aria-label", label);
    play.querySelector("[data-composition-label]").textContent = label;
    play.querySelector("[aria-hidden]").textContent = intent ? "Ⅱ" : "▶";
    if (changed)
      document.dispatchEvent(
        new CustomEvent("composition-playback", {
          detail: { playing: intent },
        }),
      );
  }

  function pause() {
    generation++;
    intent = started = buffering = false;
    videos.forEach((video) => video.pause());
    cancelAnimationFrame(frame);
    status.textContent = "";
    publish();
  }

  function seekTo(value) {
    targetTime = Math.max(0, Math.min(Number(value), episode.duration));
    for (const video of videos) {
      if (video.readyState) video.currentTime = targetTime;
    }
    updateTime();
  }

  function synchronize() {
    if (!intent || buffering) return;
    if (
      companion.readyState >= 2 &&
      Math.abs(companion.currentTime - master.currentTime) > 0.12
    )
      companion.currentTime = master.currentTime;
    updateTime();
    frame = requestAnimationFrame(synchronize);
  }

  async function start() {
    if (!disclosure.open || document.hidden) return;
    const token = ++generation;
    intent = true;
    started = buffering = false;
    status.textContent = "";
    if (master.ended || targetTime >= episode.duration - 0.05) seekTo(0);
    publish();
    for (const video of videos) {
      if (!video.hasAttribute("src")) video.src = video.dataset.src;
      if (video.error) video.load();
    }
    const results = await Promise.allSettled(
      videos.map((video) => video.play()),
    );
    if (token !== generation) return;
    if (results.some((result) => result.status === "rejected")) {
      autoplayFailed = true;
      pause();
      status.textContent =
        "Both views could not start. Press Play both views to retry.";
      return;
    }
    started = true;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(synchronize);
  }

  videos.forEach((video, index) => {
    const clip = index ? episode.ego : episode.thirdPerson;
    video.dataset.src = clip.video;
    setMediaPoster(video, clip.poster);
    video.addEventListener("loadedmetadata", () => {
      video.currentTime = targetTime;
      updateTime();
    });
    video.addEventListener("waiting", () => {
      if (!intent || !started) return;
      buffering = true;
      videos.forEach((item) => item.pause());
      cancelAnimationFrame(frame);
      status.textContent = "Loading both views…";
    });
    video.addEventListener("canplay", () => {
      if (intent && buffering && videos.every((item) => item.readyState >= 3))
        start();
    });
    video.addEventListener("error", () => {
      if (!video.hasAttribute("src")) return;
      autoplayFailed = true;
      pause();
      status.textContent =
        "A recording could not load. Press Play both views to retry.";
    });
  });
  master.addEventListener("timeupdate", updateTime);
  master.addEventListener("ended", () => {
    pause();
    updateTime();
  });
  play.addEventListener("click", () => {
    userPaused = intent;
    autoplayFailed = false;
    if (intent) pause();
    else start();
  });
  replay.addEventListener("click", () => {
    userPaused = autoplayFailed = false;
    seekTo(0);
    start();
  });
  seek.addEventListener("input", () => seekTo(seek.value));
  disclosure.addEventListener("toggle", () => {
    if (!disclosure.open) pause();
    else requestAnimationFrame(syncAutoplay);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
    else requestAnimationFrame(syncAutoplay);
  });
  document.addEventListener("recording-pause", pause);
  document.addEventListener("preview-motion", (event) => {
    const changed = sharedPaused !== event.detail.paused;
    sharedPaused = event.detail.paused;
    if (!changed) return;
    if (sharedPaused) pause();
    else syncAutoplay();
  });
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (!visible) pause();
    else requestAnimationFrame(syncAutoplay);
  }).observe(pair);
  seek.max = String(episode.duration);
  [play, replay, seek].forEach((element) => {
    element.disabled = false;
  });
  updateTime();
}
