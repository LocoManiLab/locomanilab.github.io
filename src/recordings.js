import { setMediaPoster } from "./media-loading.js";
import { rooms, episodes } from "./recordings-data.js?v=20261014-success";
import { enhanceRoomView } from "./room-view.js?v=20261013-models";

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
const url = (path) => new URL(path, document.baseURI).href;
const clock = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const categories = [
  ["all", "All rooms"],
  ["kitchen", "Kitchen"],
  ["living", "Living room"],
  ["bedroom", "Bedroom"],
  ["bathroom", "Bathroom"],
  ["office", "Office"],
  ["real2sim", "Real-to-sim"],
];
const categoryLabel = (id) => categories.find(([key]) => key === id)?.[1] || id;
const descriptions = {
  kitchen:
    "Counters, appliances, and articulated storage bring reaching, grasping, and navigation into a shared workspace.",
  living:
    "Tables, seating, and everyday objects connect manipulation with movement across the room.",
  bedroom:
    "Beds, desks, and low storage offer different heights and distances for whole-body interaction.",
  bathroom:
    "Fixtures and drawers create compact workspaces for navigation and object interaction.",
  office:
    "Language-generated Holodeck offices combine desks, shelving, and storage with everyday objects.",
  real2sim:
    "A separate reconstructed scene for the real-to-sim study, alongside the household benchmark rooms.",
};

export function enhanceRecordings() {
  const $ = (selector) => document.querySelector(selector);
  const roomStage = $("#room-view");
  if (!roomStage || !rooms.length || !episodes.length) return;
  const videos = [$("#episode-third-video"), $("#episode-ego-video")];
  const master = videos[0];
  const play = $("#episode-play");
  const timeline = $("#episode-seek");
  const status = $("#episode-status");
  let selected =
    episodes.find(
      (item) => item.taskId === "IThorKitchenApproachTableAndLiftApple_scene13",
    ) ||
    episodes.find((item) => item.kind === "composite") ||
    episodes[0];
  const catalogEpisodes = [
    selected,
    ...episodes.filter((item) => item.id !== selected.id),
  ];
  let activeRoom =
    rooms.find((room) => room.id === selected.roomId) || rooms[0];
  let category = "all";
  let page = 0;
  let intent = false;
  let frame;
  let generation = 0;
  let buffering = false;
  let playing = false;
  let episodeVisible = false;
  let episodePaused = false;
  let autoplayFailed = false;
  let automaticPlayback = false;
  let previewMotionPaused =
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.readyState !== "complete";
  const pageSize = 12;

  function syncEpisodeMotion() {
    if (!episodeVisible || document.hidden) {
      if (intent) pauseViews();
      return;
    }
    if (previewMotionPaused) {
      if (intent && automaticPlayback) pauseViews();
      return;
    }
    if (!intent && !episodePaused && !autoplayFailed) playViews(true);
  }

  const roomView = enhanceRoomView({ stage: roomStage });

  // All assets resolve from the document URL, including static subpath builds.
  function setVideo(video, recording, immediate = false) {
    video.pause();
    setMediaPoster(video, url(recording.poster), { immediate });
    video.dataset.src = url(recording.video);
    if (video.preload !== "none") loadVideo(video);
  }
  function loadVideo(video) {
    if (video.getAttribute("src") !== video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
    }
  }
  const duration = () =>
    Number.isFinite(master.duration) ? master.duration : selected.duration;
  function updateTimeline() {
    const length = duration();
    timeline.max = String(length);
    timeline.value = String(Math.min(master.currentTime, length));
    timeline.setAttribute(
      "aria-valuetext",
      `${clock(master.currentTime)} of ${clock(length)}`,
    );
    $("#episode-time").textContent =
      `${clock(master.currentTime)} / ${clock(length)}`;
  }
  function updatePlayback() {
    play.setAttribute(
      "aria-label",
      intent ? "Pause both views" : "Play both views",
    );
    play.querySelector("[aria-hidden]").textContent = intent ? "Ⅱ" : "▶";
    play.querySelector("[data-play-label]").textContent = intent
      ? "Pause episode"
      : "Play episode";
  }
  function pauseViews() {
    generation++;
    intent = false;
    master.dataset.playing = "false";
    document.dispatchEvent(
      new CustomEvent("dataset-recording-playback", {
        detail: { playing: false },
      }),
    );
    buffering = false;
    playing = false;
    videos.forEach((video) => video.pause());
    cancelAnimationFrame(frame);
    updatePlayback();
  }
  function synchronize() {
    if (!intent) return;
    const companion = videos[1];
    // Both views are rendered from the same replay states and share each frame.
    // Correct decoder drift without repeatedly seeking a healthy stream.
    if (
      companion.readyState >= 2 &&
      Math.abs(companion.currentTime - master.currentTime) > 0.12
    )
      companion.currentTime = master.currentTime;
    updateTimeline();
    frame = requestAnimationFrame(synchronize);
  }
  async function playViews(automatic = false) {
    const token = ++generation;
    automaticPlayback = automatic;
    intent = true;
    master.dataset.playing = "true";
    document.dispatchEvent(
      new CustomEvent("dataset-recording-playback", {
        detail: { playing: true },
      }),
    );
    buffering = false;
    playing = false;
    status.textContent = "";
    if (master.currentTime >= duration() - 0.05) seekTo(0);
    for (const video of videos) {
      if (video.error) video.load();
      video.preload = "auto";
      video.muted = true;
      loadVideo(video);
      video.playbackRate = Number($("#episode-speed").value);
    }
    updatePlayback();
    const results = await Promise.allSettled(
      videos.map((video) => video.play()),
    );
    if (token !== generation) return;
    if (results.some((result) => result.status === "rejected")) {
      autoplayFailed = true;
      pauseViews();
      status.textContent =
        "Playback could not start. Press Play episode to try again.";
      return;
    }
    cancelAnimationFrame(frame);
    playing = true;
    frame = requestAnimationFrame(synchronize);
  }
  function seekTo(value) {
    const target = Math.max(0, Math.min(Number(value), duration()));
    const episodeId = selected.id;
    for (const video of videos) {
      if (video.readyState >= 1) video.currentTime = target;
      else
        video.addEventListener(
          "loadedmetadata",
          () => {
            // One source can finish loading after another task was selected.
            if (
              selected.id === episodeId &&
              video.dataset.episode === episodeId
            )
              video.currentTime = target;
          },
          { once: true },
        );
    }
    timeline.value = String(target);
    $("#episode-time").textContent = `${clock(target)} / ${clock(duration())}`;
  }

  function renderRooms() {
    const focusedRoom =
      document.activeElement.closest?.("[data-room]")?.dataset.room;
    const filtered = rooms.filter(
      (room) => category === "all" || room.category === category,
    );
    $("#atlas-room-count").textContent = `${filtered.length} / ${rooms.length}`;
    $("#atlas-scenes").innerHTML = filtered
      .map((room) => {
        const count = episodes.filter((item) => item.roomId === room.id).length;
        return `<button type="button" class="atlas-scene" data-room="${escape(room.id)}" aria-pressed="${room.id === activeRoom.id}"><img src="${url(room.poster)}" width="160" height="120" loading="lazy" alt="" /><span><strong>${escape(room.title)}</strong><small>${room.category === "real2sim" ? "Reconstructed scene" : `${count} recorded task${count === 1 ? "" : "s"}`}</small></span></button>`;
      })
      .join("");
    $("#atlas-category")
      .querySelectorAll("button")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.category === category),
        ),
      );
    if (focusedRoom)
      [...$("#atlas-scenes").querySelectorAll("[data-room]")]
        .find((button) => button.dataset.room === focusedRoom)
        ?.focus({ preventScroll: true });
  }
  function selectRoom(room, initial = false) {
    if (!initial && room.id === activeRoom.id) return;
    activeRoom = room;
    pauseViews();
    roomView.selectRoom(room);
    $("#atlas-family").textContent =
      room.category === "real2sim"
        ? "REAL-TO-SIM / RECONSTRUCTED SCENE"
        : `${room.family === "Holodeck" ? "HOLODECK" : "ITHOR"} / BENCHMARK ROOM`;
    $("#atlas-title").textContent = room.title;
    $("#atlas-description").textContent = descriptions[room.category];
    const count = episodes.filter((item) => item.roomId === room.id).length;
    $("#atlas-count").textContent = count
      ? `${count} recorded tasks in this room`
      : "Room preview · no task recording in this batch";
    $("#atlas-tasks").hidden = count === 0;
    renderRooms();
  }
  $("#atlas-category").innerHTML = categories
    .map(
      ([id, title]) =>
        `<button type="button" class="atlas-category" data-category="${id}" aria-pressed="${id === category}">${title}</button>`,
    )
    .join("");
  $("#atlas-category").addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    category = button.dataset.category;
    const next = rooms.find((room) => room.category === category);
    if (category !== "all" && activeRoom.category !== category && next)
      selectRoom(next);
    else renderRooms();
  });
  $("#atlas-scenes").addEventListener("click", (event) => {
    const button = event.target.closest("[data-room]");
    if (button)
      selectRoom(rooms.find((room) => room.id === button.dataset.room));
  });
  selectRoom(activeRoom, true);

  const recordedRooms = rooms.filter((room) =>
    episodes.some((item) => item.roomId === room.id),
  );
  $("#episode-room").insertAdjacentHTML(
    "beforeend",
    recordedRooms
      .map(
        (room) =>
          `<option value="${escape(room.id)}">${escape(room.title)}</option>`,
      )
      .join(""),
  );
  const filterEpisodes = () => {
    const query = $("#episode-search").value.trim().toLowerCase();
    const kind = $("#episode-kind").value;
    const roomId = $("#episode-room").value;
    return catalogEpisodes.filter(
      (item) =>
        (kind === "all" || item.kind === kind) &&
        (roomId === "all" || item.roomId === roomId) &&
        `${item.title} ${item.prompt} ${item.taskId} ${categoryLabel(item.category)} ${item.sceneId}`
          .toLowerCase()
          .includes(query),
    );
  };
  function renderEpisodes() {
    const filtered = filterEpisodes();
    const pages = Math.ceil(filtered.length / pageSize);
    page = Math.max(0, Math.min(page, pages - 1));
    $("#episode-count").textContent =
      `${filtered.length} episode${filtered.length === 1 ? "" : "s"}`;
    $("#episode-empty").hidden = filtered.length > 0;
    $("#episode-grid").innerHTML = filtered
      .slice(page * pageSize, (page + 1) * pageSize)
      .map(
        (item) =>
          `<button type="button" class="episode-card" data-episode="${escape(item.id)}" aria-pressed="${item.id === selected.id}" aria-label="Watch ${escape(item.title)} in ${escape(categoryLabel(item.category))}, scene ${item.sceneId}"><span class="episode-thumbnail"><img src="${url(item.thirdPerson.poster)}" alt="" loading="lazy" width="240" height="135" /><span>${clock(item.duration)}</span></span><span class="episode-card-info"><small>${escape(categoryLabel(item.category))} · ${item.sceneId} · ${item.kind === "atomic" ? "Atomic" : "Compositional"}</small><strong>${escape(item.title)}</strong></span></button>`,
      )
      .join("");
    $("#episode-page").textContent = pages
      ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} of ${filtered.length}`
      : "0 episodes";
    $("#episode-prev").disabled = page === 0;
    $("#episode-next").disabled = page + 1 >= pages;
    $(".episode-pagination").hidden = pages <= 1;
  }
  function selectEpisode(item, initial = false) {
    episodePaused = false;
    autoplayFailed = false;
    if (!initial && selected.id === item.id) {
      syncEpisodeMotion();
      return;
    }
    pauseViews();
    selected = item;
    videos.forEach((video, index) => {
      video.dataset.episode = item.id;
      // A directory selection prepares the chosen views without scrolling the
      // reader back to the player. Initial posters remain deferred.
      setVideo(video, index === 0 ? item.thirdPerson : item.ego, !initial);
      video.playbackRate = Number($("#episode-speed").value);
      video.setAttribute(
        "aria-label",
        `${index ? "Egocentric replay" : "Whole-body replay"}: ${item.prompt}`,
      );
    });
    $("#episode-title").textContent = item.title;
    $("#episode-prompt").textContent = `“${item.prompt}”`;
    const sourceLabel =
      item.sourceKind === "successful_policy_rollout"
        ? `${item.policy === "gr00t" ? "GR00T" : "Policy"} rollout`
        : "Dataset action replay";
    $("#episode-badges").innerHTML =
      `<span class="kind">${item.kind === "atomic" ? "ATOMIC" : "COMPOSITIONAL"}</span><span>${escape(categoryLabel(item.category))} · Scene ${item.sceneId}</span><span data-episode-source>${sourceLabel}</span>`;
    $("#episode-camera").textContent =
      item.cameraMode === "fixed" || item.cameraMode === "fixed_rear_diagonal"
        ? "Fixed third-person camera"
        : "Following camera";
    $("#episode-provenance").textContent =
      `${sourceLabel} · both views rendered from the same states · seen task · recorded speed at 1×`;
    status.textContent = "";
    updateTimeline();
    $("#episode-grid")
      .querySelectorAll("[data-episode]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.episode === selected.id),
        ),
      );
    if (!initial) syncEpisodeMotion();
  }
  $("#episode-grid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-episode]");
    if (!button) return;
    selectEpisode(episodes.find((item) => item.id === button.dataset.episode));
    button.focus({ preventScroll: true });
  });
  for (const [selector, event] of [
    ["#episode-search", "input"],
    ["#episode-kind", "change"],
    ["#episode-room", "change"],
  ])
    $(selector).addEventListener(event, () => {
      page = 0;
      renderEpisodes();
    });
  $("#episode-reset").addEventListener("click", () => {
    $("#episode-search").value = "";
    $("#episode-kind").value = $("#episode-room").value = "all";
    page = 0;
    renderEpisodes();
    $("#episode-search").focus();
  });
  for (const [selector, step] of [
    ["#episode-prev", -1],
    ["#episode-next", 1],
  ])
    $(selector).addEventListener("click", () => {
      page += step;
      renderEpisodes();
    });
  $("#atlas-tasks").addEventListener("click", () => {
    $("#episode-room").value = activeRoom.id;
    $("#episode-search").value = "";
    $("#episode-kind").value = "all";
    page = 0;
    const first = episodes.find((item) => item.roomId === activeRoom.id);
    if (first) selectEpisode(first);
    renderEpisodes();
    $("#tasks").scrollIntoView({ behavior: "instant", block: "start" });
    play.focus({ preventScroll: true });
  });
  play.addEventListener("click", () => {
    episodePaused = intent;
    autoplayFailed = false;
    if (intent) pauseViews();
    else playViews();
  });
  $("#episode-restart").addEventListener("click", () => {
    seekTo(0);
  });
  timeline.addEventListener("input", () => seekTo(timeline.value));
  $("#episode-speed").addEventListener("change", () => {
    videos.forEach((video) => {
      video.playbackRate = Number($("#episode-speed").value);
    });
  });
  master.addEventListener("timeupdate", updateTimeline);
  master.addEventListener("loadedmetadata", updateTimeline);
  master.addEventListener("ended", () => {
    episodePaused = true;
    pauseViews();
    updateTimeline();
  });
  for (const video of videos) {
    video.addEventListener("waiting", () => {
      if (!intent || !playing) return;
      buffering = true;
      videos.forEach((item) => item.pause());
      status.textContent = "Loading both views…";
    });
    video.addEventListener("canplay", () => {
      if (intent && buffering && videos.every((item) => item.readyState >= 3))
        playViews(automaticPlayback);
    });
    video.addEventListener("error", () => {
      autoplayFailed = true;
      pauseViews();
      status.textContent =
        "A recording could not load. Press Play episode to retry both views.";
    });
  }
  document.addEventListener("preview-motion", (event) => {
    const changed = previewMotionPaused !== event.detail.paused;
    previewMotionPaused = event.detail.paused;
    if (changed) syncEpisodeMotion();
  });
  document.addEventListener("visibilitychange", () => {
    syncEpisodeMotion();
  });
  // Load task metadata near the viewport and autoplay the paired player only
  // while visible. Directory thumbnails stay as lazily loaded still posters.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target;
        if (entry.isIntersecting && video.preload === "none") {
          video.preload = "metadata";
          loadVideo(video);
        }
      }
    },
    { rootMargin: "150px 0px" },
  );
  selectEpisode(selected, true);
  renderEpisodes();
  videos.forEach((video) => observer.observe(video));
  new IntersectionObserver(
    (entries) => {
      episodeVisible = entries[0].isIntersecting;
      syncEpisodeMotion();
    },
    { threshold: 0 },
  ).observe($(".episode-feature"));
}
