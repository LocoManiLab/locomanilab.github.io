import { generatedTasks } from "./generated-dataset-data.js?v=20261013-generated";

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
const clock = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const categoryLabel = (category) =>
  category === "composite"
    ? "Compositional"
    : category.charAt(0).toUpperCase() + category.slice(1);

export function enhanceGeneratedDataset() {
  const section = document.querySelector("#dataset-generated");
  if (!section || section.dataset.enhanced || !generatedTasks.length) return;
  section.dataset.enhanced = "true";
  const categories = [...new Set(generatedTasks.map((task) => task.category))];
  section.innerHTML = `
    <p class="generated-intro">Explore GPT-augmented and Kimodo-generated trajectories across ${generatedTasks.length} tasks.</p>
    <div class="generated-summary" aria-label="Generated sample collection">
      <span><strong>${generatedTasks.length}</strong> tasks</span>
      <span><strong>2</strong> sources</span>
      <span><strong>${generatedTasks.length * 2}</strong> sample episodes</span>
    </div>
    <div class="generated-browser">
      <div class="generated-source-switch" role="group" aria-label="Generation source">
        <button type="button" data-generated-source="gpt" aria-pressed="true">GPT augmentation</button>
        <button type="button" data-generated-source="kimodo" aria-pressed="false">Kimodo</button>
      </div>
      <div class="generated-categories" role="group" aria-label="Filter generated tasks">
        <button type="button" data-generated-category="all" aria-pressed="true">All tasks</button>
        ${categories.map((category) => `<button type="button" data-generated-category="${escape(category)}" aria-pressed="false">${escape(categoryLabel(category))}</button>`).join("")}
      </div>
      <div class="generated-task-picker">
        <label for="generated-task">Task</label>
        <select id="generated-task"></select>
        <span id="generated-task-count"></span>
      </div>
    </div>
    <div class="generated-task-copy">
      <p class="generated-task-category" id="generated-category"></p>
      <h4 id="generated-task-title"></h4>
      <p id="generated-prompt"></p>
    </div>
    <div class="generated-player" id="generated-player" data-source="gpt" data-playing="false">
      <figure id="generated-third-figure">
        <figcaption>Third-person <span>Saved-state replay</span></figcaption>
        <video id="generated-third-video" muted playsinline preload="none" aria-label="Generated demonstration, third-person view"></video>
      </figure>
      <figure>
        <figcaption>Egocentric <span>Robot camera</span></figcaption>
        <video id="generated-ego-video" muted playsinline preload="none" aria-label="Generated demonstration, egocentric view"></video>
      </figure>
    </div>
    <p class="generated-source-note" id="generated-source-note"></p>
    <div class="generated-controls">
      <button id="generated-play" type="button"><span aria-hidden="true">▶</span><span data-generated-play-label>Play both views</span></button>
      <button id="generated-replay" type="button">Replay</button>
      <label class="sr-only" for="generated-seek">Generated demonstration playback position</label>
      <input id="generated-seek" type="range" min="0" step="0.01" value="0" />
      <output id="generated-time" for="generated-seek"></output>
    </div>
    <p class="generated-status" id="generated-status" role="status"></p>
    <p class="generated-footnote">One selected episode per task and source.</p>`;

  const $ = (selector) => section.querySelector(selector);
  const player = $("#generated-player");
  const third = $("#generated-third-video");
  const ego = $("#generated-ego-video");
  const videos = [third, ego];
  const play = $("#generated-play");
  const seek = $("#generated-seek");
  const time = $("#generated-time");
  const status = $("#generated-status");
  const taskSelect = $("#generated-task");
  let selected = generatedTasks[0];
  let source = "gpt";
  let category = "all";
  let intent = false;
  let started = false;
  let buffering = false;
  let generation = 0;
  let frame;
  let targetTime = 0;
  let pendingSeek = null;
  let visible = false;
  let userPaused = false;
  let autoplayFailed = false;
  let sharedPaused =
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    navigator.connection?.saveData === true ||
    document.readyState !== "complete";
  const clip = () => selected.sources[source];
  const activeVideos = () => (source === "gpt" ? videos : [ego]);
  const master = () => (source === "gpt" ? third : ego);
  const duration = () => clip().duration;
  const isActive = (video) => activeVideos().includes(video);

  function syncAutoplay() {
    if (
      visible &&
      section.getClientRects().length &&
      !document.hidden &&
      !sharedPaused &&
      !userPaused &&
      !autoplayFailed &&
      !intent
    )
      start();
  }

  function updateTime() {
    const lead = master();
    const current = Math.min(
      duration(),
      pendingSeek ?? (lead.readyState ? lead.currentTime : targetTime),
    );
    targetTime = current;
    seek.value = String(current);
    seek.setAttribute(
      "aria-valuetext",
      `${clock(current)} of ${clock(duration())}`,
    );
    time.textContent = `${clock(current)} / ${clock(duration())}`;
  }

  function publish() {
    const changed = player.dataset.playing !== String(intent);
    player.dataset.playing = String(intent);
    const label = `${intent ? "Pause" : "Play"} ${source === "gpt" ? "both views" : "episode"}`;
    play.setAttribute("aria-label", label);
    play.querySelector("[data-generated-play-label]").textContent = label;
    play.querySelector("[aria-hidden]").textContent = intent ? "Ⅱ" : "▶";
    if (changed)
      document.dispatchEvent(
        new CustomEvent("generated-dataset-playback", {
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

  function applySeek(video) {
    if (!video.readyState) return;
    const end = Number.isFinite(video.duration) ? video.duration : duration();
    const position = Math.min(targetTime, Math.max(0, end - 0.001));
    if (Math.abs(video.currentTime - position) > 0.015)
      video.currentTime = position;
  }

  function settleSeek() {
    if (
      activeVideos().every((video) => video.readyState >= 2 && !video.seeking)
    )
      pendingSeek = null;
    updateTime();
    resumeIfReady();
  }

  function seekTo(value) {
    targetTime = Math.max(0, Math.min(Number(value), duration()));
    pendingSeek = targetTime;
    if (intent) {
      generation++;
      started = false;
      buffering = true;
      activeVideos().forEach((video) => video.pause());
      cancelAnimationFrame(frame);
    }
    activeVideos().forEach(applySeek);
    updateTime();
    // A seek to the current frame may not emit a seeked event.
    queueMicrotask(settleSeek);
  }

  function synchronize() {
    if (!intent || buffering) return;
    const lead = master();
    if (
      source === "gpt" &&
      !ego.seeking &&
      ego.readyState >= 2 &&
      Math.abs(ego.currentTime - lead.currentTime) > 0.12
    )
      ego.currentTime = lead.currentTime;
    updateTime();
    frame = requestAnimationFrame(synchronize);
  }

  async function start() {
    if (document.hidden || !section.getClientRects().length) return;
    const token = ++generation;
    intent = true;
    started = buffering = false;
    status.textContent = "";
    if (master().ended || targetTime >= duration() - 0.05) {
      targetTime = 0;
      pendingSeek = 0;
    }
    publish();
    // Publishing can synchronously trigger a global pause or another player.
    if (token !== generation || !intent) return;
    const currentVideos = activeVideos();
    for (const video of currentVideos) {
      if (!video.hasAttribute("src")) {
        video.preload = "auto";
        video.src = video.dataset.src;
      } else if (video.error) video.load();
      applySeek(video);
    }
    const results = await Promise.allSettled(
      currentVideos.map((video) => video.play()),
    );
    if (token !== generation) return;
    if (results.some((result) => result.status === "rejected")) {
      autoplayFailed = true;
      pause();
      status.textContent = "This episode could not start. Press Play to retry.";
      return;
    }
    started = true;
    pendingSeek = null;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(synchronize);
  }

  function resumeIfReady() {
    if (
      intent &&
      buffering &&
      activeVideos().every((video) => video.readyState >= 3 && !video.seeking)
    )
      start();
  }

  function prepareMedia() {
    pause();
    userPaused = autoplayFailed = false;
    targetTime = 0;
    pendingSeek = 0;
    for (const video of videos) {
      video.removeAttribute("src");
      video.removeAttribute("poster");
      delete video.dataset.src;
      video.preload = "none";
      video.load();
    }
    for (const [video, camera] of [
      [third, "thirdperson"],
      [ego, "ego"],
    ]) {
      const view = clip()[camera];
      if (!view) continue;
      video.dataset.src = view.video;
      video.poster = view.poster;
      video.muted = true;
      video.setAttribute(
        "aria-label",
        `${selected.title}: ${source === "gpt" ? "GPT-augmented" : "Kimodo-generated"} ${camera === "ego" ? "egocentric" : "third-person"} view`,
      );
    }
    player.dataset.source = source;
    player.dataset.task = selected.id;
    $("#generated-third-figure").hidden = source !== "gpt";
    $("#generated-category").textContent = categoryLabel(selected.category);
    $("#generated-task-title").textContent = selected.title;
    $("#generated-prompt").textContent = selected.prompt;
    $("#generated-source-note").textContent =
      source === "gpt"
        ? "Third-person saved-state replay and the original egocentric recording share the same episode timeline."
        : "Kimodo currently includes egocentric recordings only. Third-person replay awaits the original simulator states.";
    section.querySelectorAll("[data-generated-source]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.generatedSource === source),
      );
    });
    seek.max = String(duration());
    publish();
    updateTime();
    requestAnimationFrame(syncAutoplay);
  }

  function updateTasks() {
    const tasks = generatedTasks.filter(
      (task) => category === "all" || task.category === category,
    );
    if (!tasks.includes(selected)) selected = tasks[0];
    taskSelect.innerHTML = tasks
      .map(
        (task) =>
          `<option value="${escape(task.id)}">${escape(task.title)}</option>`,
      )
      .join("");
    taskSelect.value = selected.id;
    $("#generated-task-count").textContent =
      `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
    section.querySelectorAll("[data-generated-category]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.generatedCategory === category),
      );
    });
  }

  section.addEventListener("click", (event) => {
    const sourceButton = event.target.closest("[data-generated-source]");
    if (sourceButton && sourceButton.dataset.generatedSource !== source) {
      source = sourceButton.dataset.generatedSource;
      prepareMedia();
    }
    const categoryButton = event.target.closest("[data-generated-category]");
    if (
      categoryButton &&
      categoryButton.dataset.generatedCategory !== category
    ) {
      category = categoryButton.dataset.generatedCategory;
      const previous = selected;
      updateTasks();
      if (selected !== previous) prepareMedia();
    }
  });
  taskSelect.addEventListener("change", () => {
    selected = generatedTasks.find((task) => task.id === taskSelect.value);
    prepareMedia();
  });
  play.addEventListener("click", () => {
    userPaused = intent;
    autoplayFailed = false;
    if (intent) pause();
    else start();
  });
  $("#generated-replay").addEventListener("click", () => {
    userPaused = autoplayFailed = false;
    pause();
    seekTo(0);
    start();
  });
  seek.addEventListener("input", () => seekTo(seek.value));
  for (const video of videos) {
    video.addEventListener("loadedmetadata", () => {
      if (!isActive(video) || !video.hasAttribute("src")) return;
      applySeek(video);
      updateTime();
    });
    video.addEventListener("seeked", () => {
      if (isActive(video) && video.hasAttribute("src")) settleSeek();
    });
    video.addEventListener("canplay", () => {
      if (isActive(video) && video.hasAttribute("src")) settleSeek();
    });
    video.addEventListener("waiting", () => {
      if (!isActive(video) || !intent || !started) return;
      targetTime = master().currentTime;
      buffering = true;
      activeVideos().forEach((item) => item.pause());
      cancelAnimationFrame(frame);
      status.textContent =
        source === "gpt" ? "Loading both views…" : "Loading episode…";
      resumeIfReady();
    });
    video.addEventListener("timeupdate", () => {
      if (video === master() && video.hasAttribute("src")) updateTime();
    });
    video.addEventListener("ended", () => {
      if (!isActive(video) || !video.hasAttribute("src")) return;
      pause();
      updateTime();
    });
    video.addEventListener("error", () => {
      if (!isActive(video) || !video.hasAttribute("src")) return;
      autoplayFailed = true;
      pause();
      status.textContent = "A recording could not load. Press Play to retry.";
    });
  }
  const disclosure = section.closest("details.generated-corpus");
  disclosure?.addEventListener("toggle", () => {
    if (!disclosure.open) pause();
    else requestAnimationFrame(syncAutoplay);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
    else requestAnimationFrame(syncAutoplay);
  });
  document.addEventListener("recording-pause", pause);
  document.addEventListener("preview-motion", (event) => {
    const wasPaused = sharedPaused;
    sharedPaused = event.detail.paused;
    if (sharedPaused && !wasPaused) pause();
    else if (!sharedPaused && wasPaused) syncAutoplay();
  });
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (!visible) pause();
    else requestAnimationFrame(syncAutoplay);
  }).observe(player);
  updateTasks();
  prepareMedia();
}
