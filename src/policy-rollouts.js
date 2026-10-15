const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );

const number = (value) => Number(value || 0).toLocaleString("en-US");
const seenSettings = new Set([
  "baseline/atom_seen",
  "baseline/composite_seen",
  "dr/atom_seen_mild",
  "dr/atom_seen_standard",
  "dr/atom_seen_stress",
  "dr/composite_seen_mild",
  "dr/composite_seen_standard",
  "dr/composite_seen_stress",
]);
const outcomeLabel = (clip) =>
  clip.outcome === "success"
    ? "Success"
    : /timeout/i.test(clip.filenameLabel || "")
      ? "Timeout"
      : "Failure";

export const policyRolloutsPendingMarkup = `
  <div class="wrap rollout-wrap rollout-release">
    <div class="rollout-heading">
      <h3 id="policy-rollouts-title">Policy rollouts</h3>
      <p>The 7,607 selected policy rollouts are being prepared for release.</p>
    </div>
    <a class="text-link" href="./index.html#tasks">View task demonstrations <span aria-hidden="true">↗</span></a>
  </div>`;

export function enhancePolicyRollouts() {
  const root = document.querySelector("#policy-rollouts-root");
  const section = document.querySelector("#policy-rollouts");
  if (!root || !section || root.dataset.enhanced === "true") return;
  root.dataset.enhanced = "true";
  if (section.dataset.availability === "pending") {
    root.innerHTML = policyRolloutsPendingMarkup;
    return;
  }
  const pageSize = 12;
  let catalog;
  let loading = false;
  let page = 0;
  let selectedGroup;
  let selectedClip;
  let player;
  let playback = false;
  let filtered = [];
  let mediaGeneration = 0;
  let playerObserver;
  let requestedPolicy;

  const header = `
    <div class="rollout-heading">
      <h3 id="policy-rollouts-title">Policy rollouts</h3>
      <p>Evaluation rollouts on seen tasks with the SONIC controller.</p>
    </div>`;
  root.innerHTML = `<div class="wrap rollout-wrap">${header}
    <p class="rollout-loading" role="status">The rollout directory loads as you reach this section.</p></div>`;

  function mediaURL(kind, id, group) {
    const base =
      (kind === "poster"
        ? root.dataset.posterBase || section.dataset.posterBase
        : policyFor(group)?.videoBase ||
          root.dataset.mediaBase ||
          section.dataset.mediaBase) ||
      (kind === "poster" ? "/rollout-posters/" : "/rollout-media/");
    return new URL(
      `${encodeURIComponent(id)}.${kind === "poster" ? "jpg" : "mp4"}`,
      new URL(base.endsWith("/") ? base : `${base}/`, document.baseURI),
    ).href;
  }

  const $ = (selector) => root.querySelector(selector);
  const policyFor = (group) =>
    catalog.policies.find((policy) => policy.id === group.policy);
  const settingFor = (group) =>
    catalog.settings.find((setting) => setting.id === group.setting);
  const taskFor = (group) =>
    catalog.tasks.find((task) => task.id === group.task);
  const visibleClips = (group) =>
    group.clips.filter(
      (clip) =>
        $("#rollout-outcome").value === "all" ||
        clip.outcome === $("#rollout-outcome").value,
    );
  const trialCounts = (group) => {
    const success = Number(group.sourceCounts?.success || 0);
    const failure = Number(group.sourceCounts?.failure || 0);
    return { success, total: success + failure };
  };

  function announcePlayback(playing) {
    if (player) player.dataset.playing = String(playing);
    if (playback === playing) return;
    playback = playing;
    document.dispatchEvent(
      new CustomEvent("policy-rollout-playback", { detail: { playing } }),
    );
  }

  function pause() {
    if (player) player.pause();
    announcePlayback(false);
  }

  function clearMedia() {
    mediaGeneration++;
    pause();
    if (!player?.hasAttribute("src")) return;
    player.removeAttribute("src");
    player.load();
  }

  function selectClip(group, clip, shouldPlay = false) {
    const changed = selectedClip?.id !== clip.id;
    if (changed) clearMedia();
    selectedGroup = group;
    selectedClip = clip;
    const task = taskFor(group);
    const policy = policyFor(group);
    const setting = settingFor(group);
    const counts = trialCounts(group);
    player.poster = mediaURL("poster", clip.id, group);
    player.setAttribute(
      "aria-label",
      `${policy?.label || group.policy}: ${task?.title || group.task}, ${outcomeLabel(clip)}`,
    );
    player.controls = player.hasAttribute("src");
    $("#rollout-play").hidden = player.hasAttribute("src");
    $("#rollout-current-task").textContent = task?.title || group.task;
    $("#rollout-current-policy").textContent = policy?.label || group.policy;
    $("#rollout-current-setting").textContent = setting?.label || group.setting;
    $("#rollout-current-outcome").textContent = outcomeLabel(clip);
    $("#rollout-current-outcome").dataset.outcome = clip.outcome;
    $("#rollout-current-episode").textContent =
      `Episode ${String(clip.episode).padStart(3, "0")}`;
    $("#rollout-current-evaluation").textContent = counts.total
      ? `${number(counts.success)} / ${number(counts.total)} successes in the original evaluation`
      : "Original evaluation counts unavailable";
    $("#rollout-genuine-note").hidden = !(
      clip.resultsSuccess && clip.genuine === false
    );
    $("#rollout-player-status").textContent = "";
    $("#rollout-current-filename").textContent = [
      clip.steps ? `${number(clip.steps)} recorded steps` : "",
      clip.bytes ? `${(clip.bytes / 1_000_000).toFixed(2)} MB` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    root.querySelectorAll("[data-rollout-clip]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.rolloutClip === clip.id),
      );
    });
    if (shouldPlay) playSelected();
  }

  function playSelected() {
    if (!selectedClip) return;
    const requestGeneration = ++mediaGeneration;
    const src = mediaURL("video", selectedClip.id, selectedGroup);
    if (player.getAttribute("src") !== src) {
      player.src = src;
      player.load();
    } else if (player.error) player.load();
    player.controls = true;
    $("#rollout-play").hidden = true;
    $("#rollout-player-status").textContent = "Loading rollout…";
    player.play().catch((error) => {
      if (requestGeneration !== mediaGeneration || error.name === "AbortError")
        return;
      $("#rollout-player-status").textContent =
        error.name === "NotAllowedError"
          ? "Press play in the player to start this rollout."
          : "Unable to load this rollout. Please try again.";
    });
  }

  function renderPage() {
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.max(0, Math.min(page, pageCount - 1));
    const groups = filtered.slice(page * pageSize, (page + 1) * pageSize);
    $("#rollout-grid").innerHTML = groups.length
      ? groups
          .map((group) => {
            const task = taskFor(group);
            const clips = visibleClips(group);
            const poster =
              clips.find((clip) => clip.outcome === "success") || clips[0];
            const counts = trialCounts(group);
            return `<article class="rollout-card" data-rollout-group="${escape(group.id)}">
            <div class="rollout-card-poster">
              <img src="${escape(mediaURL("poster", poster.id, group))}" alt="" width="320" height="240" loading="lazy" decoding="async">
              <span class="rollout-card-scene">${task?.sceneId ? `Scene ${escape(task.sceneId)}` : ""}</span>
            </div>
            <div class="rollout-card-body">
              <h3>${escape(task?.title || group.task)}</h3>
              <p class="rollout-card-evaluation">${counts.total ? `${number(counts.success)} / ${number(counts.total)} evaluation successes` : "Evaluation counts unavailable"}</p>
              <div class="rollout-card-clips">${clips
                .map(
                  (clip) => `
                <button type="button" class="rollout-clip" data-rollout-clip="${escape(clip.id)}" data-outcome="${escape(clip.outcome)}"
                  aria-pressed="${clip.id === selectedClip?.id}" aria-label="Play ${escape(outcomeLabel(clip).toLowerCase())}, episode ${escape(clip.episode)}, ${escape(task?.title || group.task)}">
                  <span class="rollout-outcome-dot" aria-hidden="true"></span><span>${escape(outcomeLabel(clip))}</span>
                  <small>ep ${String(clip.episode).padStart(3, "0")}</small><span aria-hidden="true">↗</span>
                </button>`,
                )
                .join("")}
              </div>
            </div></article>`;
          })
          .join("")
      : `<div class="rollout-empty"><p>No rollouts match these filters. Try another task, setting, or outcome.</p><button type="button" id="rollout-clear-filters" class="rollout-retry">Clear filters</button></div>`;
    $("#rollout-page").textContent = `${page + 1} / ${pageCount}`;
    $("#rollout-prev").disabled = page === 0;
    $("#rollout-next").disabled = page >= pageCount - 1;
    const clips = filtered.reduce(
      (total, group) => total + visibleClips(group).length,
      0,
    );
    $("#rollout-status").textContent =
      `${number(filtered.length)} task groups · ${number(clips)} selected rollouts`;
    $("#rollout-pagination").hidden = pageCount <= 1;
    root.querySelectorAll(".rollout-card-poster img").forEach((image) => {
      image.addEventListener(
        "error",
        () => {
          image.hidden = true;
          image.parentElement.classList.add("is-unavailable");
        },
        { once: true },
      );
    });
  }

  function filterGroups() {
    const search = $("#rollout-search").value.trim().toLowerCase();
    const policy = $("#rollout-policy").value;
    const setting = $("#rollout-setting").value;
    filtered = catalog.groups.filter((group) => {
      if (
        group.policy !== policy ||
        group.setting !== setting ||
        !visibleClips(group).length
      )
        return false;
      const task = taskFor(group);
      return (
        !search ||
        `${task?.title || ""} ${task?.sceneId || ""} ${group.task}`
          .toLowerCase()
          .includes(search)
      );
    });
    page = 0;
    pause();
    if (filtered.length) {
      const previous = filtered.find((group) => group.id === selectedGroup?.id);
      const sameTask = filtered.find(
        (group) => group.task === selectedGroup?.task,
      );
      const preferred =
        !selectedGroup &&
        (filtered.find(
          (group) =>
            group.task === "IThorKitchenCloseFridge_scene13" &&
            visibleClips(group).some((clip) => clip.outcome === "success"),
        ) ||
          filtered.find(
            (group) =>
              group.task.startsWith("IThorKitchen") &&
              visibleClips(group).some((clip) => clip.outcome === "success"),
          ));
      const group = previous || sameTask || preferred || filtered[0];
      const clips = visibleClips(group);
      const clip =
        clips.find((item) => item.id === selectedClip?.id) ||
        clips.find((item) => item.outcome === "success") ||
        clips[0];
      selectClip(group, clip);
      $("#rollout-feature").hidden = false;
    } else {
      clearMedia();
      $("#rollout-feature").hidden = true;
    }
    renderPage();
  }

  function applyRequestedPolicy() {
    if (!requestedPolicy || !catalog) return;
    const policy = catalog.policies.find((item) => item.id === requestedPolicy);
    requestedPolicy = undefined;
    if (!policy) return;
    $("#rollout-policy").value = policy.id;
    $("#rollout-outcome").value = "all";
    $("#rollout-search").value = "";
    selectedGroup = undefined;
    filterGroups();
  }

  function renderDirectory() {
    const stats = catalog.stats;
    root.innerHTML = `<div class="wrap rollout-wrap">${header}
      <div class="rollout-summary" aria-label="Selected rollout collection">
        <span><strong>${number(stats.clips)}</strong> selected rollouts</span>
        <span><strong>${number(stats.policies)}</strong> policies</span>
        <span><strong>${number(stats.settings)}</strong> evaluation settings</span>
        <span><strong>${number(stats.tasks)}</strong> task definitions</span>
      </div>
      <div class="rollout-toolbar" role="group" aria-label="Filter policy rollouts">
        <label>Evaluation setting<select id="rollout-setting">${catalog.settings.map((setting) => `<option value="${escape(setting.id)}">${escape(setting.label)}</option>`).join("")}</select></label>
        <label>Policy<select id="rollout-policy">${catalog.policies.map((policy) => `<option value="${escape(policy.id)}">${escape(policy.label)}</option>`).join("")}</select></label>
        <label>Outcome<select id="rollout-outcome"><option value="all">Success &amp; failure</option><option value="success">Success</option><option value="failure">Failure</option></select></label>
        <label class="rollout-search-label">Find a task<input id="rollout-search" type="search" placeholder="Task name or scene…" autocomplete="off"></label>
      </div>
      <div class="rollout-feature" id="rollout-feature">
        <div class="rollout-player-stage" id="rollout-player-stage">
          <video id="rollout-video" preload="none" playsinline aria-label="Selected policy rollout"></video>
          <button id="rollout-play" class="rollout-play" type="button"><span aria-hidden="true">▶</span> Play selected rollout</button>
        </div>
        <div class="rollout-feature-info">
          <p class="small-label">SELECTED POLICY ROLLOUT</p>
          <h3 id="rollout-current-task"></h3>
          <p class="rollout-feature-policy"><strong id="rollout-current-policy"></strong><span>SONIC controller</span></p>
          <p id="rollout-current-setting" class="rollout-feature-setting"></p>
          <div class="rollout-feature-outcome"><span id="rollout-current-outcome" class="rollout-outcome"></span><span id="rollout-current-episode"></span></div>
          <p id="rollout-current-evaluation" class="rollout-feature-evaluation"></p>
          <p id="rollout-genuine-note" class="rollout-genuine-note" hidden>Results record this episode as a success; its genuine-success flag is false.</p>
          <p id="rollout-player-status" class="rollout-player-status" role="status"></p>
          <p id="rollout-current-filename" class="rollout-filename"></p>
        </div>
      </div>
      <div class="rollout-browser-heading"><p class="small-label">BROWSE TASK OUTCOMES</p><p id="rollout-status" role="status"></p></div>
      <div id="rollout-grid" class="rollout-grid"></div>
      <nav id="rollout-pagination" class="rollout-pagination" aria-label="Policy rollout pages">
        <button id="rollout-prev" type="button" aria-label="Previous rollout page">←</button><span id="rollout-page"></span><button id="rollout-next" type="button" aria-label="Next rollout page">→</button>
      </nav>
      <p class="rollout-selection-note">Selected clips: the earliest successful and unsuccessful episode for each policy, setting, and task, where available. Timeouts count as failures. Evaluation counts come from the original results, not the selected clips.</p>
    </div>`;
    player = $("#rollout-video");
    player.dataset.playing = "false";
    $("#rollout-policy").value =
      catalog.policies.find((policy) => policy.id === "pi05")?.id ||
      catalog.policies[0].id;
    $("#rollout-setting").value =
      catalog.settings.find((setting) => setting.id === "baseline/atom_seen")
        ?.id || catalog.settings[0].id;
    ["#rollout-setting", "#rollout-policy", "#rollout-outcome"].forEach(
      (selector) => {
        $(selector).addEventListener("change", filterGroups);
      },
    );
    $("#rollout-search").addEventListener("input", filterGroups);
    $("#rollout-play").addEventListener("click", playSelected);
    $("#rollout-grid").addEventListener("click", (event) => {
      if (event.target.closest("#rollout-clear-filters")) {
        $("#rollout-search").value = "";
        $("#rollout-outcome").value = "all";
        $("#rollout-policy").value =
          catalog.policies.find((policy) => policy.id === "pi05")?.id ||
          catalog.policies[0].id;
        $("#rollout-setting").value =
          catalog.settings.find(
            (setting) => setting.id === "baseline/atom_seen",
          )?.id || catalog.settings[0].id;
        selectedGroup = undefined;
        filterGroups();
        return;
      }
      const button = event.target.closest("[data-rollout-clip]");
      if (!button) return;
      const groupId = button.closest("[data-rollout-group]").dataset
        .rolloutGroup;
      const group = filtered.find((item) => item.id === groupId);
      const clip = group?.clips.find(
        (item) => item.id === button.dataset.rolloutClip,
      );
      if (clip) {
        // Bring the one player into view before starting a clip from the grid.
        // An immediate scroll also respects users who prefer reduced motion.
        $("#rollout-player-stage").scrollIntoView({
          block: "center",
          behavior: "instant",
        });
        selectClip(group, clip, true);
      }
    });
    $("#rollout-prev").addEventListener("click", () => {
      page--;
      renderPage();
    });
    $("#rollout-next").addEventListener("click", () => {
      page++;
      renderPage();
    });
    player.addEventListener("play", () => {
      $("#rollout-play").hidden = true;
      announcePlayback(true);
    });
    player.addEventListener("playing", () => {
      $("#rollout-player-status").textContent = "";
    });
    player.addEventListener("pause", () => announcePlayback(false));
    player.addEventListener("ended", () => announcePlayback(false));
    player.addEventListener("error", () => {
      if (!player.hasAttribute("src")) return;
      announcePlayback(false);
      $("#rollout-play").hidden = false;
      $("#rollout-player-status").textContent =
        "Unable to load this rollout. Please try again.";
    });
    if ("IntersectionObserver" in window) {
      playerObserver = new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting) pause();
        },
        { threshold: 0 },
      );
      playerObserver.observe($("#rollout-player-stage"));
    }
    filterGroups();
  }

  async function loadCatalog() {
    if (loading || catalog) return;
    loading = true;
    try {
      const response = await fetch(
        new URL(
          "../media/results/policy-rollouts-catalog.json",
          import.meta.url,
        ),
        { cache: "no-cache" },
      );
      if (!response.ok) throw new Error(`Catalog returned ${response.status}`);
      catalog = await response.json();
      // Constrain the browser even if it receives a stale broader catalog.
      catalog.settings = catalog.settings.filter(
        (setting) => setting.split === "seen" && seenSettings.has(setting.id),
      );
      const settingIds = new Set(catalog.settings.map((setting) => setting.id));
      catalog.groups = catalog.groups.filter((group) =>
        settingIds.has(group.setting),
      );
      const taskIds = new Set(catalog.groups.map((group) => group.task));
      const policyIds = new Set(catalog.groups.map((group) => group.policy));
      catalog.tasks = catalog.tasks.filter((task) => taskIds.has(task.id));
      catalog.policies = catalog.policies.filter((policy) =>
        policyIds.has(policy.id),
      );
      const clips = catalog.groups.flatMap((group) => group.clips);
      catalog.stats = {
        clips: clips.length,
        groups: catalog.groups.length,
        policies: catalog.policies.length,
        tasks: catalog.tasks.length,
        settings: catalog.settings.length,
        sourceBytes: clips.reduce((sum, clip) => sum + clip.bytes, 0),
        sourceTrials: catalog.groups.reduce(
          (sum, group) =>
            sum + group.sourceCounts.success + group.sourceCounts.failure,
          0,
        ),
        successClips: clips.filter((clip) => clip.outcome === "success").length,
        failureClips: clips.filter((clip) => clip.outcome === "failure").length,
      };
      if (
        !catalog.groups?.length ||
        !catalog.policies?.length ||
        !catalog.settings?.length
      ) {
        catalog = undefined;
        throw new Error("Rollout catalog is empty");
      }
      renderDirectory();
      applyRequestedPolicy();
    } catch {
      catalog = undefined;
      root.innerHTML = `<div class="wrap rollout-wrap">${header}<p class="rollout-loading" role="status">The rollout directory could not be loaded.</p><button type="button" class="rollout-retry">Try again</button></div>`;
      $(".rollout-retry").addEventListener("click", loadCatalog);
    } finally {
      loading = false;
    }
  }

  document.addEventListener("policy-rollout-select", (event) => {
    if (typeof event.detail?.policy !== "string") return;
    requestedPolicy = event.detail.policy;
    if (catalog) applyRequestedPolicy();
    else loadCatalog();
  });
  document.addEventListener("recording-pause", pause);
  document.addEventListener("dataset-recording-playback", (event) => {
    if (event.detail?.playing) pause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        loadCatalog();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(section);
  } else loadCatalog();
}
