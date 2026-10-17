import { enhanceMediaControls } from "./media-controls.js?v=20261017-unified";
import { enhanceNavigation } from "./navigation.js?v=20261013-pages";
import { enhanceRecordings } from "./recordings.js?v=20261014-success-replay";
import { enhanceDatasetDR } from "./dataset-dr.js?v=20261013-generated";
import { enhanceGeneratedDataset } from "./generated-dataset.js?v=20261014-corpus";
import { enhanceHeroWall } from "./hero-wall.js?v=20261014-success-replay";
import {
  animateSwap,
  stabilizeText,
  enhanceReading,
  enhanceDisclosures,
} from "./experience.js?v=20261013-merged-tasks";
import { enhancePageMotion } from "./motion.js?v=20261009-rhythm";
import { enhanceOverview } from "./overview.js?v=20261014-live-overview";
import { enhanceComposition } from "./composition.js?v=20261014-success-replay";
import { enhanceSim2Real } from "./sim2real.js?v=20261017-clean-trials";
import { enhanceResultTables } from "./benchmark.js?v=20261017-home-studies";
import { enhanceTransferStudies } from "./transfer-studies.js?v=20261017-home-studies";
import { enhanceExecutionStack } from "./stack.js?v=20261009-stack-final";
import {
  policyProfiles,
  controllerProfiles,
  organizationLogos,
  policyLogo,
} from "./stack-data.js?v=20261017-results";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
// Preserve bookmarked result views after moving evaluation to its own page.
const resultAnchors = new Set([
  "#results",
  "#benchmark-results",
  "#benchmark-generalization",
  "#benchmark-robustness",
  "#benchmark-controllers",
  "#controller-radar",
  "#policy-rollouts",
]);
function redirectResultBookmark() {
  if (resultAnchors.has(location.hash))
    location.replace(
      new URL(`./leaderboard.html${location.hash}`, document.baseURI),
    );
}
redirectResultBookmark();
window.addEventListener("hashchange", redirectResultBookmark);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let motionPaused =
  reducedMotion.matches || navigator.connection?.saveData === true;
let previewsReady = document.readyState === "complete";
let foregroundRecordingPlaying = false;

const controllers = [
  {
    id: "sonic",
    name: "SONIC",
    interface: "motion_token",
    action: 78,
    state: 43,
    description:
      "Tracks 64-dimensional motion tokens with a matching decoder. Finger targets use a separate hand-control path.",
    parts: [
      ["Motion token", 64, "#b5c1e5"],
      ["Hand targets", 14, "#dbb979"],
    ],
    note: "Token semantics depend on the encoder–decoder checkpoint; matching dimensions alone do not establish compatibility.",
  },
  {
    id: "amo",
    name: "AMO",
    interface: "velocity_cmd",
    action: 36,
    state: 32,
    description:
      "Controls the base and torso; arm joint targets come from IK or teleoperation retargeting.",
    parts: [
      ["Arms", 14, "#b5c1e5"],
      ["Base + torso", 8, "#828eb3"],
      ["Hand targets", 14, "#dbb979"],
    ],
    note: "The 32-dimensional state contains 28 measured arm-and-hand joints plus the previous torso orientation and height commands.",
  },
  {
    id: "heft",
    name: "HEFT",
    interface: "ref_qpos",
    action: 50,
    state: 43,
    description:
      "Tracks root pose and 29 body-joint reference angles, with separate finger targets.",
    parts: [
      ["Root pose", 7, "#828eb3"],
      ["Body joints", 29, "#b5c1e5"],
      ["Hand targets", 14, "#dbb979"],
    ],
    note: "The native reference layout preserves the episode frame, quaternion convention, and body-joint order.",
  },
  {
    id: "almi",
    name: "ALMI",
    interface: "twist_ee",
    action: 52,
    state: 43,
    description:
      "Combines base velocity and height with upper-body references for the waist, end effectors, and joints.",
    parts: [
      ["Base command", 4, "#828eb3"],
      ["Upper reference", 34, "#b5c1e5"],
      ["Hand targets", 14, "#dbb979"],
    ],
    note: "The upper-body reference has 34 dimensions; the base command has four. Hands add a further 14 targets.",
  },
  {
    id: "scalebfm",
    name: "ScaleBFM",
    interface: "ref_qpos",
    action: 50,
    state: 43,
    description:
      "Executes whole-body reference motion with the same root-pose and joint-reference layout as the HEFT adapter.",
    parts: [
      ["Root pose", 7, "#828eb3"],
      ["Body joints", 29, "#b5c1e5"],
      ["Hand targets", 14, "#dbb979"],
    ],
    note: "A shared reference layout enables compatible interfaces; controller identity and checkpoint remain part of the evaluated stack.",
  },
];

const citation = `@misc{wang2026locomanilab,
  title = {{LocoManiLab}: A Unified Testbed for Data, Policies,
           Controllers, and Deployment in Humanoid Loco-Manipulation},
  author = {Wang, Dewei and Han, Jinrui and Shi, Jiyuan and
            Zhang, Chenyun and Lu, Xianbo and Wu, Jiabao and
            Feng, Jiqin and Kong, Jipeng and Luo, Ping and
            Bai, Chenjia and Li, Xuelong},
  year = {2026},
  note = {Manuscript in preparation}
}`;

// Roving focus and automatic activation follow the ARIA tabs pattern.
function connectTabs(container, activate) {
  container.addEventListener("click", (event) => {
    const button = event.target.closest('[role="tab"]');
    if (button) activate(button.dataset.id);
  });
  container.addEventListener("keydown", (event) => {
    const buttons = $$('[role="tab"]', container);
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[next].focus();
    activate(buttons[next].dataset.id);
  });
}

function updateTabState(container, id) {
  $$('[role="tab"]', container).forEach((button) => {
    const active = button.dataset.id === id;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  const active = container.querySelector('[aria-selected="true"]');
  if (active && container.scrollWidth > container.clientWidth) {
    const tab = active.getBoundingClientRect();
    const strip = container.getBoundingClientRect();
    if (tab.left < strip.left || tab.right > strip.right) {
      container.scrollBy({
        left: tab.left - strip.left - (strip.width - tab.width) / 2,
        behavior: reducedMotion.matches ? "instant" : "smooth",
      });
    }
  }
}

$("#controller-tabs").innerHTML = controllers
  .map(
    (controller, index) =>
      `<button type="button" role="tab" class="controller-tab" id="controller-${controller.id}" data-id="${controller.id}" aria-controls="controller-panel" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}"><span class="controller-brand">${organizationLogos(controllerProfiles[controller.id].organizations)}</span><strong>${controller.name}</strong></button>`,
  )
  .join("");
function selectController(id) {
  const controller = controllers.find((item) => item.id === id);
  updateTabState($("#controller-tabs"), id);
  $("#controller-panel").setAttribute("aria-labelledby", `controller-${id}`);
  $("#controller-name").textContent = controller.name;
  $("#controller-project").href = controllerProfiles[id].url;
  $("#controller-project").setAttribute(
    "aria-label",
    `${controller.name} project`,
  );
  $("#controller-affiliation").textContent = controllerProfiles[id].affiliation;
  $("#controller-interface").textContent = controller.interface;
  $("#controller-description").textContent = controller.description;
  $("#controller-note").textContent = controller.note;
  $("#action-dim").textContent = controller.action;
  $("#state-dim").textContent = controller.state;
  $("#dimension-bar").innerHTML = controller.parts
    .map(
      ([, count, color]) =>
        `<span style="--dim:${count};--color:${color}"></span>`,
    )
    .join("");
  $("#dimension-legend").innerHTML = controller.parts
    .map(
      ([name, count, color]) =>
        `<span><i style="--color:${color}"></i>${name} · ${count}</span>`,
    )
    .join("");
  animateSwap($("#controller-panel"));
}
connectTabs($("#controller-tabs"), selectController);
selectController("sonic");
$("#policy-roster").innerHTML = policyProfiles
  .map(
    (policy) =>
      `<a class="policy-card" href="${policy.url}" target="_blank" rel="noopener"><span class="policy-card-heading"><strong>${policy.name}</strong><span aria-hidden="true">↗</span></span><span class="policy-brand">${policyLogo(policy)}</span><span class="policy-affiliation">${policy.affiliation}</span></a>`,
  )
  .join("");

const corpusDetails = {
  atomic:
    "<strong>5,258 episodes · 9.3 hours.</strong> SONIC · 103 atomic tasks.",
  composite:
    "<strong>6,801 episodes · 32.8 hours.</strong> SONIC · 131 compositional tasks, each with two to four steps.",
  others:
    "<strong>2,101 episodes · 9.3 hours.</strong> AMO, HEFT, ALMI &amp; ScaleBFM · 10 shared bathroom tasks (5 atomic, 5 compositional).",
};
function selectCorpus(id) {
  $("#corpus-detail").innerHTML = corpusDetails[id];
  $$(".corpus-legend button").forEach((button) => {
    const active = button.dataset.corpus === id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $$(".corpus-segment").forEach((button) =>
    button.setAttribute("aria-pressed", String(button.dataset.corpus === id)),
  );
}
$$("[data-corpus]").forEach((button) =>
  button.addEventListener("click", () => selectCorpus(button.dataset.corpus)),
);
selectCorpus("atomic");

// Visible previews loop automatically; reduced-motion users get still posters.
enhanceHeroWall();
const previewObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const video = entry.target;
      video.dataset.visible = entry.isIntersecting ? "true" : "false";
      if (
        entry.isIntersecting &&
        previewsReady &&
        !motionPaused &&
        !foregroundRecordingPlaying &&
        !document.hidden
      )
        playPreview(video);
      else video.pause();
    }
  },
  { threshold: 0.2 },
);
function playPreview(video) {
  if (!previewsReady) return;
  if (!video.getAttribute("src")) video.src = video.dataset.src;
  video.play().catch(() => {
    /* A poster remains visible if autoplay is blocked. */
  });
}
function syncMotion() {
  $$("[data-preview]").forEach((video) => {
    if (
      !motionPaused &&
      !foregroundRecordingPlaying &&
      video.dataset.visible === "true" &&
      !document.hidden
    )
      playPreview(video);
    else video.pause();
  });
  document.dispatchEvent(
    new CustomEvent("preview-motion", {
      detail: { paused: motionPaused || !previewsReady },
    }),
  );
}
$$("[data-preview]").forEach((video) => previewObserver.observe(video));
reducedMotion.addEventListener("change", (event) => {
  motionPaused = event.matches;
  syncMotion();
});
document.addEventListener("visibilitychange", syncMotion);
for (const type of [
  "policy-rollout-playback",
  "open-space-playback",
  "dataset-recording-playback",
  "sim2real-playback",
  "composition-playback",
  "generated-dataset-playback",
]) {
  document.addEventListener(type, () => {
    // Playback events can nest when one player pauses the other. Read their
    // current state instead of letting a nested pause restart the previews.
    foregroundRecordingPlaying = !!document.querySelector(
      '#open-space-video[data-playing="true"], #rollout-video[data-playing="true"], #episode-third-video[data-playing="true"], #sim2real-pair[data-playing="true"], #composition-pair[data-playing="true"], #generated-player[data-playing="true"]',
    );
    syncMotion();
  });
}
syncMotion();

// Let text, fonts, and the main image settle before downloading video previews.
if (!previewsReady)
  window.addEventListener(
    "load",
    () => {
      const start = () => {
        previewsReady = true;
        syncMotion();
      };
      if ("requestIdleCallback" in window)
        requestIdleCallback(start, { timeout: 1200 });
      else setTimeout(start, 100);
    },
    { once: true },
  );

enhanceNavigation();
enhanceRecordings();
enhanceDatasetDR();
enhanceGeneratedDataset();
enhanceExecutionStack(selectController);
enhanceDisclosures();
enhanceReading();
enhancePageMotion();
enhanceOverview();
enhanceSim2Real();
enhanceResultTables(document.querySelector("#experiments"));
enhanceTransferStudies();
enhanceComposition();
stabilizeText(
  $("#controller-affiliation"),
  Object.values(controllerProfiles).map((item) => item.affiliation),
);
stabilizeText(
  $("#controller-description"),
  controllers.map((item) => item.description),
);
stabilizeText(
  $("#controller-note"),
  controllers.map((item) => item.note),
);
$("#citation-text").textContent = citation;
$("#copy-citation").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(citation);
    $("#copy-citation").textContent = "Copied ✓";
    $("#copy-status").textContent = "BibTeX copied to clipboard.";
    window.setTimeout(() => {
      $("#copy-citation").textContent = "Copy BibTeX";
    }, 2200);
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents($("#citation-text"));
    selection.removeAllRanges();
    selection.addRange(range);
    $("#copy-status").textContent =
      "Clipboard is unavailable. Citation text selected; use your browser copy command.";
    $("#copy-citation").textContent = "Select & copy below";
  }
});

enhanceMediaControls();
