import { datasetDrClips } from "./dataset-dr-data.js?v=20261012-recorded-dr";

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const url = (path) => new URL(path, document.baseURI).href;

export function enhanceDatasetDR() {
  const section = document.querySelector("#dataset-dr");
  if (!section || !datasetDrClips[0]?.videos) return;
  section.innerHTML = `
    <div class="dr-heading">
      <div><p class="eyebrow">DOMAIN RANDOMIZATION</p>
        <h3 id="dataset-dr-title">Visual domain randomization</h3></div>
      <p>Texture and lighting variations along the same recorded trajectory,
        shown in third-person and egocentric views.</p>
    </div>
    <div class="dr-stage">
      <video id="dr-video" muted loop playsinline preload="none" aria-label="Dataset replay under domain randomization"></video>
      <span class="dr-variant-badge" id="dr-current-variant"></span>
      <button id="dr-motion-toggle" type="button" aria-pressed="false" aria-label="Pause variations">
        <span aria-hidden="true" data-dr-motion-icon>Ⅱ</span><span data-dr-motion-label>Pause variations</span>
      </button>
    </div>
    <div class="dr-caption">
      <div><h4 id="dr-current-task"></h4><p id="dr-camera-note"></p></div>
    </div>
    <progress id="dr-phase-progress" value="0" max="1" aria-label="Variation loop progress"></progress>
    <div id="dr-tasks" class="dr-tasks" role="group" aria-label="Choose a dataset trajectory">
      ${datasetDrClips
        .map(
          (
            clip,
          ) => `<button type="button" data-dr-clip="${escape(clip.id)}" aria-pressed="false">
        <span>${escape(clip.title)}</span><small>${clip.kind === "atomic" ? "Atomic" : "Compositional"} · Scene ${clip.sceneId}</small>
      </button>`,
        )
        .join("")}
    </div>
    <p class="dr-footnote">Appearance changes every 0.2 seconds. Motion and camera trajectories stay continuous.</p>
    <p id="dr-status" class="dr-status" role="status"></p>`;
  const $ = (selector) => section.querySelector(selector);
  const video = $("#dr-video");
  const toggle = $("#dr-motion-toggle");
  video.muted = true;
  let selected = datasetDrClips[0];
  let pendingSeek = 0;
  let displayedVariant;
  let visible = false;
  let localPaused = false;
  let sharedPaused =
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.readyState !== "complete";
  let generation = 0;
  let animation;
  const foregroundPlaying = () =>
    !!document.querySelector(
      '#rollout-video[data-playing="true"], #episode-third-video[data-playing="true"], #composition-pair[data-playing="true"], #sim2real-pair[data-playing="true"], #generated-player[data-playing="true"]',
    );
  function updatePhase() {
    const time = pendingSeek ?? video.currentTime ?? 0;
    const phase =
      selected.phases.find((p) => time >= p.start && time < p.end) ||
      selected.phases[0];
    if (displayedVariant !== phase.index) {
      displayedVariant = phase.index;
      $("#dr-current-variant").textContent =
        `Appearance ${String(phase.index).padStart(2, "0")} / ${selected.variantCount}`;
      $("#dr-current-variant").dataset.variant = phase.index;
    }
    $("#dr-phase-progress").max = selected.duration;
    $("#dr-phase-progress").value = Math.min(time, selected.duration);
  }
  function tick() {
    updatePhase();
    if (!video.paused) animation = requestAnimationFrame(tick);
  }
  function updateToggle() {
    const paused = localPaused || sharedPaused;
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute(
      "aria-label",
      paused ? "Play variations" : "Pause variations",
    );
    $("[data-dr-motion-icon]").textContent = paused ? "▷" : "Ⅱ";
    $("[data-dr-motion-label]").textContent = paused
      ? "Play variations"
      : "Pause variations";
  }
  function sync() {
    updateToggle();
    const canDisplay =
      visible && section.getClientRects().length > 0 && !document.hidden;
    const active =
      canDisplay &&
      !localPaused &&
      !sharedPaused &&
      !foregroundPlaying();
    video.autoplay = active;
    if (!active) {
      video.pause();
      return;
    }
    const target = url(selected.videos.comparison);
    if (video.src !== target) {
      video.preload = "auto";
      video.src = target;
      video.load();
    } else if (video.error) video.load();
    const token = generation;
    if (video.paused)
      video.play().catch((error) => {
        if (token !== generation || error.name === "AbortError") return;
        localPaused = true;
        updateToggle();
        $("#dr-status").textContent = "Play variations to start the preview.";
      });
  }
  function prepareMedia() {
    generation++;
    video.pause();
    cancelAnimationFrame(animation);
    pendingSeek = 0;
    displayedVariant = undefined;
    video.removeAttribute("src");
    video.preload = "none";
    video.load();
    video.poster = url(selected.posters.comparison);
    const size = selected.viewSizes.comparison;
    $(".dr-stage").style.aspectRatio = `${size.width} / ${size.height}`;
    video.setAttribute(
      "aria-label",
      `${selected.title}: paired third-person and ego dataset replay under domain randomization`,
    );
    $("#dr-current-task").textContent = selected.title;
    $("#dr-camera-note").textContent =
      "Third-person + ego cameras · Dataset replay";
    $("#dr-status").textContent = "";
    section
      .querySelectorAll("[data-dr-clip]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.drClip === selected.id),
        ),
      );
    updatePhase();
  }
  function select(clip) {
    selected = clip;
    prepareMedia();
    sync();
  }
  $("#dr-tasks").addEventListener("click", (event) => {
    const id = event.target.closest("[data-dr-clip]")?.dataset.drClip;
    const clip = datasetDrClips.find((item) => item.id === id);
    if (clip && clip !== selected) select(clip);
  });
  toggle.addEventListener("click", () => {
    if (localPaused || sharedPaused) {
      localPaused = false;
      sharedPaused = false;
    } else localPaused = true;
    $("#dr-status").textContent = "";
    sync();
  });
  video.addEventListener("loadedmetadata", () => {
    if (pendingSeek !== null) {
      video.currentTime = Math.min(
        pendingSeek,
        Math.max(0, video.duration - 0.001),
      );
      pendingSeek = null;
    }
    updatePhase();
  });
  for (const event of ["timeupdate", "seeked", "ended"])
    video.addEventListener(event, updatePhase);
  video.addEventListener("playing", () => {
    $("#dr-status").textContent = "";
    cancelAnimationFrame(animation);
    tick();
  });
  video.addEventListener("pause", () => cancelAnimationFrame(animation));
  video.addEventListener("error", () => {
    if (!video.hasAttribute("src")) return;
    localPaused = true;
    updateToggle();
    $("#dr-status").textContent =
      "This preview could not load. Play variations to retry.";
  });
  document.addEventListener("preview-motion", (event) => {
    sharedPaused = event.detail.paused;
    sync();
  });
  for (const event of [
    "visibilitychange",
    "stackchange",
    "policy-rollout-playback",
    "dataset-recording-playback",
    "sim2real-playback",
    "composition-playback",
    "generated-dataset-playback",
  ])
    document.addEventListener(event, () => sync());
  document.addEventListener("recording-pause", () => video.pause());
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      sync();
    },
    { threshold: 0.1 },
  ).observe(video);
  select(selected);
}
