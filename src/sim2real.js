import { sim2realTasks } from "./sim2real-data.js";

const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
const durationLabel = (seconds) => {
  const total = Math.round(Number(seconds) || 0);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/** Compare the supplied simulation and physical recordings at their own speeds. */
export function enhanceSim2Real() {
  const root = document.querySelector("#sim2real-root");
  if (!root || root.dataset.enhanced === "true" || !sim2realTasks.length)
    return;
  root.dataset.enhanced = "true";
  let taskIndex = 0;
  let trialIndex = 0;
  let generation = 0;
  let announcedPlaying = false;
  let pausingOtherRecordings = false;
  let visible = false;
  let autoplayEnabled = true;
  let sharedPaused =
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    navigator.connection?.saveData === true ||
    document.readyState !== "complete";
  const pendingPauses = new WeakMap();

  root.innerHTML = `
    <div class="sim2real-tabs" role="tablist" aria-label="Sim-to-real tasks">
      ${sim2realTasks
        .map(
          (
            task,
            index,
          ) => `<button type="button" role="tab" id="sim2real-tab-${escape(task.id)}"
            aria-controls="sim2real-panel" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}"
            data-sim2real-task="${escape(task.id)}"><span class="sim2real-tab-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><span>${escape(task.title)}</span></button>`,
        )
        .join("")}
    </div>
    <div id="sim2real-panel" role="tabpanel" tabindex="0" aria-labelledby="sim2real-tab-${escape(sim2realTasks[0].id)}">
      <div class="sim2real-task-heading">
        <p id="sim2real-instruction"></p>
        <span id="sim2real-trial-count"></span>
      </div>
      <div id="sim2real-pair" class="sim2real-pair" data-playing="false">
        <article class="sim2real-recording">
          <div class="sim2real-recording-heading"><h3><span class="sim2real-domain-dot" aria-hidden="true"></span>Simulation</h3><span class="sim2real-duration" id="sim2real-sim-duration"></span></div>
          <div class="sim2real-video-frame"><video id="sim2real-sim-video" muted playsinline preload="none" data-playing="false"></video></div>
          <div class="composition-controls sim2real-clip-controls" role="group" aria-label="Simulation playback">
            <button class="sim2real-individual-play" type="button" data-sim2real-play="0" aria-label="Play simulation"><span aria-hidden="true" data-play-icon>▶</span><span data-play-label>Play</span></button>
            <input class="sim2real-seek" type="range" min="0" max="1000" step="1" value="0" aria-label="Simulation timeline" disabled />
            <output class="sim2real-time" aria-live="off">0:00 / 0:00</output>
          </div>
          <p class="sim2real-clip-status" id="sim2real-sim-status" role="status"></p>
        </article>
        <article class="sim2real-recording">
          <div class="sim2real-recording-heading"><h3><span class="sim2real-domain-dot sim2real-domain-dot-real" aria-hidden="true"></span>Physical robot</h3><span class="sim2real-duration" id="sim2real-real-duration"></span></div>
          <div class="sim2real-video-frame"><video id="sim2real-real-video" muted playsinline preload="none" data-playing="false"></video></div>
          <div class="composition-controls sim2real-clip-controls" role="group" aria-label="Physical robot playback">
            <button class="sim2real-individual-play" type="button" data-sim2real-play="1" aria-label="Play physical robot"><span aria-hidden="true" data-play-icon>▶</span><span data-play-label>Play</span></button>
            <input class="sim2real-seek" type="range" min="0" max="1000" step="1" value="0" aria-label="Physical robot timeline" disabled />
            <output class="sim2real-time" aria-live="off">0:00 / 0:00</output>
          </div>
          <p class="sim2real-clip-status" id="sim2real-real-status" role="status"></p>
        </article>
      </div>
      <div class="sim2real-controls">
        <div class="sim2real-playback-controls">
          <button type="button" id="sim2real-play" class="sim2real-play"><span aria-hidden="true" data-play-icon>▶</span><span data-play-label>Play both</span></button>
          <button type="button" id="sim2real-replay" class="sim2real-replay"><span aria-hidden="true">↻</span>Replay both</button>
        </div>
        <div class="sim2real-trial-selector" role="group" aria-label="Physical robot trial"><span class="sim2real-trial-label">Real trials</span><div id="sim2real-trials"></div></div>
      </div>
      <p class="sim2real-timeline-note">Start both clips together, or explore each independently. Original recording speeds; separate timelines.</p>
    </div>`;

  const $ = (selector) => root.querySelector(selector);
  const pair = $("#sim2real-pair");
  const videos = [$("#sim2real-sim-video"), $("#sim2real-real-video")];
  const statuses = [$("#sim2real-sim-status"), $("#sim2real-real-status")];
  const tabs = [...root.querySelectorAll("[data-sim2real-task]")];
  const playButton = $("#sim2real-play");
  const individualButtons = [...root.querySelectorAll("[data-sim2real-play]")];
  const seekInputs = [...root.querySelectorAll(".sim2real-seek")];
  const timeOutputs = [...root.querySelectorAll(".sim2real-time")];
  const clipLabels = ["simulation", "physical robot"];

  function updateTimeline(index) {
    const video = videos[index];
    const ready =
      video.readyState >= 1 &&
      Number.isFinite(video.duration) &&
      video.duration > 0;
    const duration = ready
      ? video.duration
      : Number(video.dataset.duration) || 0;
    const currentTime = ready ? Math.min(video.currentTime, duration) : 0;
    seekInputs[index].disabled = !ready || Boolean(video.error);
    seekInputs[index].value = duration
      ? Math.round((currentTime / duration) * 1000)
      : 0;
    seekInputs[index].setAttribute(
      "aria-valuetext",
      `${durationLabel(currentTime)} of ${durationLabel(duration)}`,
    );
    timeOutputs[index].textContent =
      `${durationLabel(currentTime)} / ${durationLabel(duration)}`;
  }

  function publishPlayback() {
    individualButtons.forEach((button, index) => {
      const playing = videos[index].dataset.playing === "true";
      button.querySelector("[data-play-label]").textContent = playing
        ? "Pause"
        : "Play";
      button.querySelector("[data-play-icon]").textContent = playing
        ? "Ⅱ"
        : "▶";
      button.setAttribute(
        "aria-label",
        `${playing ? "Pause" : "Play"} ${clipLabels[index]}`,
      );
    });
    const playing = videos.some((video) => video.dataset.playing === "true");
    pair.dataset.playing = String(playing);
    playButton.querySelector("[data-play-label]").textContent = playing
      ? "Pause both"
      : "Play both";
    playButton.querySelector("[data-play-icon]").textContent = playing
      ? "Ⅱ"
      : "▶";
    if (announcedPlaying === playing) return;
    announcedPlaying = playing;
    document.dispatchEvent(
      new CustomEvent("sim2real-playback", { detail: { playing } }),
    );
  }

  function pausePair() {
    generation++;
    for (const video of videos) {
      video.dataset.playing = "false";
      pauseVideo(video);
    }
    publishPlayback();
  }

  function pauseVideo(video) {
    // Each recording can be paused independently. Only explicit
    // user pauses disable autoplay; leaving the viewport should just suspend it.
    if (!video.paused)
      pendingPauses.set(video, (pendingPauses.get(video) || 0) + 1);
    video.pause();
  }

  function autoplayPair(restart = false) {
    if (visible && !document.hidden && !sharedPaused && autoplayEnabled)
      playPair(restart);
  }

  function pauseOtherMedia() {
    // The existing recording player has its own playback intent and frame loop.
    // Cancel that intent as well as pausing its media elements.
    pausingOtherRecordings = true;
    document.dispatchEvent(new CustomEvent("recording-pause"));
    document.querySelectorAll("video").forEach((video) => {
      if (!videos.includes(video)) video.pause();
    });
    pausingOtherRecordings = false;
  }

  function configureVideo(video, clip, label, statusIndex) {
    pauseVideo(video);
    video.dataset.playing = "false";
    video.removeAttribute("src");
    video.dataset.src = clip.src;
    video.dataset.duration = clip.duration;
    video.controls = false;
    video.poster = clip.poster || "";
    video.setAttribute("aria-label", label);
    video.setAttribute("aria-describedby", statuses[statusIndex].id);
    video.muted = true;
    video.playbackRate = 1;
    video.load();
    updateTimeline(statusIndex);
    statuses[statusIndex].textContent = "";
  }

  function selectTask(index) {
    pausePair();
    taskIndex = index;
    trialIndex = 0;
    const task = sim2realTasks[taskIndex];
    root.dataset.task = task.id;
    $("#sim2real-instruction").textContent = task.instruction;
    $("#sim2real-trial-count").textContent =
      `1 simulation · ${task.trials.length} real trials`;
    $("#sim2real-panel").setAttribute("aria-labelledby", tabs[index].id);
    tabs.forEach((tab, tabIndex) => {
      tab.setAttribute("aria-selected", String(tabIndex === index));
      tab.tabIndex = tabIndex === index ? 0 : -1;
    });
    configureVideo(videos[0], task.simulation, `${task.title}: simulation`, 0);
    $("#sim2real-sim-duration").textContent = durationLabel(
      task.simulation.duration,
    );
    $("#sim2real-trials").innerHTML = task.trials
      .map(
        (trial, index) =>
          `<button type="button" data-sim2real-trial="${escape(trial.id)}" aria-pressed="${index === 0}" aria-label="${escape(task.title)}, ${escape(trial.label)}">${escape(trial.label)}</button>`,
      )
      .join("");
    selectTrial(0);
  }

  function selectTrial(index) {
    pausePair();
    autoplayEnabled = true;
    trialIndex = index;
    const task = sim2realTasks[taskIndex];
    const trial = task.trials[trialIndex];
    root.dataset.trial = trial.id;
    configureVideo(
      videos[1],
      trial,
      `${task.title}: physical robot, ${trial.label}`,
      1,
    );
    $("#sim2real-real-duration").textContent =
      `${trial.label} · ${durationLabel(trial.duration)}`;
    root
      .querySelectorAll("[data-sim2real-trial]")
      .forEach((button, buttonIndex) => {
        button.setAttribute("aria-pressed", String(buttonIndex === index));
      });
    autoplayPair(true);
  }

  function prepareVideo(index) {
    const video = videos[index];
    if (video.getAttribute("src") !== video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
    } else if (video.error) video.load();
    return video;
  }

  async function playIndividual(index) {
    const token = ++generation;
    const video = prepareVideo(index);
    if (video.ended) video.currentTime = 0;
    statuses[index].textContent = "Loading recording…";
    try {
      await video.play();
    } catch (error) {
      if (token !== generation || error.name === "AbortError") return;
      statuses[index].textContent =
        error.name === "NotAllowedError"
          ? "Use this player’s play button to start the recording."
          : "This recording could not load. Press play to retry.";
      video.dataset.playing = "false";
      publishPlayback();
    }
  }

  async function playPair(restart = false) {
    const token = ++generation;
    if (restart || videos.some((video) => video.ended)) {
      for (const video of videos) video.currentTime = 0;
    }
    // The streams have unequal durations and represent separate recordings.
    // Never seek or change speed to force either recording onto the other's clock.
    const attempts = videos.map((video, index) => {
      prepareVideo(index);
      statuses[index].textContent =
        !video.paused && video.readyState >= 3 ? "" : "Loading recording…";
      return video.play();
    });
    const results = await Promise.allSettled(attempts);
    if (token !== generation) return;
    results.forEach((result, index) => {
      if (result.status !== "rejected" || result.reason?.name === "AbortError")
        return;
      videos[index].dataset.playing = "false";
      statuses[index].textContent =
        result.reason?.name === "NotAllowedError"
          ? "Use this player’s play button to start the recording."
          : "This recording could not load. Press Play both to retry.";
    });
    publishPlayback();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTask(index));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft")
        next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      selectTask(next);
      tabs[next].focus();
    });
  });
  $("#sim2real-trials").addEventListener("click", (event) => {
    const button = event.target.closest("[data-sim2real-trial]");
    if (!button) return;
    selectTrial(
      sim2realTasks[taskIndex].trials.findIndex(
        (trial) => trial.id === button.dataset.sim2realTrial,
      ),
    );
  });
  playButton.addEventListener("click", () => {
    if (pair.dataset.playing === "true") {
      autoplayEnabled = false;
      pausePair();
    } else {
      autoplayEnabled = true;
      playPair();
    }
  });
  $("#sim2real-replay").addEventListener("click", () => {
    autoplayEnabled = true;
    playPair(true);
  });
  individualButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      if (!videos[index].paused) {
        generation++;
        autoplayEnabled = false;
        pauseVideo(videos[index]);
        videos[index].dataset.playing = "false";
        publishPlayback();
      } else {
        autoplayEnabled = true;
        playIndividual(index);
      }
    });
  });
  seekInputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      const video = videos[index];
      if (input.disabled || !Number.isFinite(video.duration)) return;
      video.currentTime = (Number(input.value) / 1000) * video.duration;
      updateTimeline(index);
    });
  });
  videos.forEach((video, index) => {
    for (const event of [
      "loadedmetadata",
      "durationchange",
      "timeupdate",
      "seeked",
      "emptied",
    ])
      video.addEventListener(event, () => updateTimeline(index));
    video.addEventListener("play", () => {
      if (video.paused) return;
      if (!visible || document.hidden) {
        pausePair();
        return;
      }
      autoplayEnabled = true;
      video.dataset.playing = "true";
      publishPlayback();
      pauseOtherMedia();
    });
    video.addEventListener("playing", () => {
      statuses[index].textContent = "";
    });
    video.addEventListener("waiting", () => {
      if (!video.paused) statuses[index].textContent = "Loading recording…";
    });
    for (const event of ["pause", "ended"]) {
      video.addEventListener(event, () => {
        if (event === "pause") {
          const pending = pendingPauses.get(video) || 0;
          if (pending) pendingPauses.set(video, pending - 1);
          else if (!video.ended) autoplayEnabled = false;
        }
        video.dataset.playing = "false";
        if (statuses[index].textContent === "Loading recording…")
          statuses[index].textContent = "";
        publishPlayback();
      });
    }
    video.addEventListener("error", () => {
      if (!video.hasAttribute("src")) return;
      video.dataset.playing = "false";
      updateTimeline(index);
      statuses[index].textContent =
        "This recording could not load. Press Play both to retry.";
      publishPlayback();
    });
  });
  for (const name of [
    "composition-playback",
    "dataset-recording-playback",
    "policy-rollout-playback",
    "generated-dataset-playback",
  ]) {
    document.addEventListener(name, (event) => {
      if (event.detail?.playing) pausePair();
    });
  }
  document.addEventListener("recording-pause", () => {
    if (!pausingOtherRecordings) pausePair();
  });
  document.addEventListener("preview-motion", (event) => {
    const wasPaused = sharedPaused;
    sharedPaused = event.detail.paused;
    if (sharedPaused === wasPaused) return;
    if (sharedPaused) pausePair();
    else autoplayPair();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pausePair();
    else autoplayPair();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) autoplayPair();
        else pausePair();
      },
      { threshold: 0 },
    ).observe(pair);
  } else {
    visible = true;
  }
  selectTask(0);
}
