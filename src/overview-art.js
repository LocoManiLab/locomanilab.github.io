// Real room thumbnails and task recordings ground the interactive feature tour.
import { rooms, episodes } from "./recordings-data.js?v=20261014-success";
import { generatedTasks } from "./generated-dataset-data.js?v=20261014-generated";
import { datasetDrClips } from "./dataset-dr-data.js?v=20261012-recorded-dr";
import { sim2realTasks } from "./sim2real-data.js?v=20261013-unified-controls";

const basketEpisode = episodes.find(
  (episode) =>
    episode.taskId === "IThorLivingRoomPackCandleStatueIntoBasket_scene209",
);
const fridgeEpisode = episodes.find(
  (episode) => episode.taskId === "IThorKitchenOpenFridge_scene13",
);
const generatedEpisode = generatedTasks.find(
  (episode) => episode.taskId === "IThorKitchenOpenFridge_scene13",
);
const policyRollout = episodes.find(
  (episode) => episode.sourceKind === "successful_policy_rollout",
);
const transferTask = sim2realTasks[0];
const transferTrial = transferTask.trials[1] || transferTask.trials[0];

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
const image = (src, className = "", alt = "") =>
  `<img class="${className}" src="${src}" alt="${escape(alt)}" loading="lazy" decoding="async" />`;
const preview = (src, poster, label, className = "", speed = 1) =>
  `<video class="${className}" data-tour-src="${src}" data-tour-speed="${speed}" poster="${poster}" aria-label="${escape(label)}" muted loop playsinline preload="none" tabindex="-1"></video>`;
const pairedViews = (thirdPerson, ego, title) =>
  `<div class="tour-data-views">
    <div>${preview(thirdPerson.video, thirdPerson.poster, `${title}: whole-body episode replay`)}<span>Whole-body replay</span></div>
    <div>${preview(ego.video, ego.poster, `${title}: egocentric episode replay`)}<span>Egocentric view</span></div>
  </div>`;

// Two full cycles let the state traces travel continuously without a jump.
const stateTrace = (phase, amplitude, baseline) => {
  const points = Array.from({ length: 101 }, (_, index) => {
    const x = index * 6;
    const y = baseline + Math.sin((x / 150) * Math.PI * 2 + phase) * amplitude;
    return `${index === 0 ? "M" : "L"}${x} ${y.toFixed(2)}`;
  });
  return `<path d="${points.join(" ")}" />`;
};

export const overviewArtwork = {
  scenes: `<div class="tour-room-scene">
    <div class="tour-gallery-heading"><strong>Every room in the benchmark</strong><span>${rooms.length} environments</span></div>
    <div class="tour-room-gallery">${rooms
      .map(
        (
          room,
        ) => `<figure class="tour-room-thumbnail" data-tour-room="${room.id}">
          ${image(room.poster, "", room.title)}<figcaption>${escape(room.title)}</figcaption>
        </figure>`,
      )
      .join("")}</div>
    <span class="tour-art-note">iTHOR · Holodeck · Real2Sim</span>
  </div>`,

  data: `<div class="tour-data-scene">
    <div class="tour-source-labels" role="group" aria-label="Data collection and generation source">
      <button type="button" data-tour-source="vr" aria-pressed="true" aria-controls="tour-data-vr">VR teleoperation</button>
      <button type="button" data-tour-source="generation" aria-pressed="false" aria-controls="tour-data-generation">Motion generation</button>
    </div>
    <div id="tour-data-vr" data-tour-source-panel="vr">
      ${pairedViews(basketEpisode.thirdPerson, basketEpisode.ego, basketEpisode.title)}
      <p class="tour-context-line">“Pack the candle and statue into the basket.”</p>
      <a class="tour-data-explore" href="#dataset">Explore teleoperation demonstrations <span aria-hidden="true">↗</span></a>
    </div>
    <div id="tour-data-generation" data-tour-source-panel="generation" hidden>
      ${pairedViews(generatedEpisode.sources.gpt.thirdperson, generatedEpisode.sources.gpt.ego, generatedEpisode.title)}
      <p class="tour-context-line">“Open the fridge door in front of you.”</p>
      <a class="tour-data-explore" href="#dataset-generated">Explore generated demonstrations <span aria-hidden="true">↗</span></a>
    </div>
    <div class="tour-episode-tracks"><span>RGB</span><span>Language</span><span>Actions</span><span>State</span></div>
    <span class="tour-art-note">Synchronized whole-body and egocentric episode videos</span>
  </div>`,

  policies: `<div class="tour-policy-scene">
    <svg class="tour-policy-connectors" viewBox="0 0 1000 320" preserveAspectRatio="none" aria-hidden="true">
      <path class="tour-flow-line" d="M 325 50 C 395 50 375 160 420 160" />
      <path class="tour-flow-line" d="M 325 150 Q 355 120 375 150  T 420 160" />
      <path class="tour-flow-line" d="M 325 260 C 395 260 375 160 420 160" />
      <path class="tour-flow-line tour-aggregate-curve" d="M 650 160 Q 674 124 694 160 T 740 160 T 786 160" />
    </svg>
    <div class="tour-policy-inputs">
      <div class="tour-policy-input tour-state-input"><b>State</b><span>Body &amp; hand state</span>
        <svg class="tour-state-curves" viewBox="0 0 300 64" preserveAspectRatio="none" role="img" aria-label="Flowing body and hand state curves"><g class="tour-wave-scroll">${stateTrace(0, 8, 16)}${stateTrace(1.5, 7, 34)}${stateTrace(3.3, 6, 51)}</g></svg>
      </div>
      <div class="tour-policy-input tour-instruction-input"><b>Instructions</b><span>“Open the fridge.”</span></div>
      <div class="tour-policy-input tour-image-input"><b>Images</b>${preview(fridgeEpisode.ego.video, fridgeEpisode.ego.poster, "Policy image input: egocentric fridge-opening episode")}</div>
    </div>
    <div class="tour-policy-options"><b>Policy</b><span>Vision-language-action</span><span>World-action model</span></div>
    <div class="tour-action-target">${image("./media/embodiment/g1-dex3-dataset-tight.webp?v=20261013-face-front", "", "Unitree G1 with Dex3 hands")}<span>Policy actions</span></div>
    <span class="tour-art-note">State + instructions + images → policy → action</span>
  </div>`,

  controllers: `<div class="tour-controller-scene">
    <svg class="tour-controller-connectors" viewBox="0 0 1000 320" preserveAspectRatio="none" aria-hidden="true">
      ${[41, 101, 161, 221, 281]
        .map(
          (y, index) =>
            `<path class="tour-flow-line tour-controller-line" style="--flow-delay: -${index * 0.32}s" d="M 340 ${y} C 410 ${y} 430 160 500 160" />`,
        )
        .join("")}
      <path class="tour-flow-line tour-controller-output" d="M 540 160 Q 610 120 650 160 T 760 160" />
    </svg>
    <div class="tour-controller-options"><span class="tour-mini-eyebrow">WHOLE-BODY CONTROL</span>
      <div><b>SONIC</b><small>Motion tokens</small></div>
      <div><b>AMO</b><small>Velocity commands</small></div>
      <div><b>HEFT</b><small>Reference motion</small></div>
      <div><b>ALMI</b><small>Base + upper body</small></div>
      <div><b>ScaleBFM</b><small>Reference motion</small></div>
    </div>
    <div class="tour-controller-action"><strong>Action</strong><span>Whole body joints</span></div>
    <div class="tour-g1-portrait">${image("./media/embodiment/g1-dex3-dataset-tight.webp?v=20261013-face-front", "", "Unitree G1 with Dex3 hands")}<span>G1 + Dex3</span></div>
    <span class="tour-art-note">Five controller interfaces → action → whole-body motion</span>
  </div>`,

  randomization: `<div class="tour-dr-scene">
    <div class="tour-gallery-heading"><strong>Recorded appearance variations</strong><span>6 tasks · 2× speed</span></div>
    <div class="tour-dr-grid">${datasetDrClips
      .map(
        (clip) =>
          `<figure class="tour-dr-preview">${preview(clip.videos.comparison, clip.posters.comparison, `${clip.title}: fast domain randomization comparison`, "", 2)}<figcaption>${escape(clip.title)}</figcaption></figure>`,
      )
      .join("")}</div>
    <span class="tour-art-note">Paired third-person and egocentric views · source-recorded randomization</span>
  </div>`,

  evaluation: `<div class="tour-evaluation-scene">
    <div class="tour-evaluation-view">${preview(policyRollout.thirdPerson.video, policyRollout.thirdPerson.poster, `GR00T successful policy rollout: ${policyRollout.title}`)}
      <span class="tour-object-marker">Task completion</span><span class="tour-motion-marker">GR00T rollout</span>
    </div>
    <div class="tour-measures"><div><strong>Task level</strong><span>Completion · generalization</span></div><div><strong>Motion level</strong><span>Stability · slip · energy · time</span></div></div>
    <span class="tour-art-note">${escape(policyRollout.title)} · successful policy rollout</span>
  </div>`,

  deployment: `<div class="tour-transfer-scene">
    <div class="tour-transfer-views">
      <div>${preview(transferTask.simulation.src, transferTask.simulation.poster, "Open the refrigerator: simulation rollout")}<span>Simulation</span></div>
      <div>${preview(transferTrial.src, transferTrial.poster, "Open the refrigerator: physical G1 rollout")}<span>Physical G1</span></div>
    </div>
    <div class="tour-transfer-caption"><strong>Open the refrigerator</strong><span>Same task across sim and real</span></div>
    <div class="tour-transfer-tasks"><span>Refrigerator</span><span>Shelf → table</span><span>Conveyor</span></div>
    <span class="tour-art-note">Supplied simulation &amp; real-world recordings</span>
  </div>`,
};
