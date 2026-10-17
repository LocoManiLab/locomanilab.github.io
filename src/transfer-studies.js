import {
  dataScalePoints,
  openSpaceCases,
  kimodoAggregate,
} from "./transfer-studies-data.js?v=20261017-results";

const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );

const scaleViews = [
  "Controller mean",
  "SONIC",
  "AMO",
  "HEFT",
  "ALMI",
  "ScaleBFM",
];
const scaleSeries = [
  { model: "GR00T N1.7", task: "Atomic", color: "#2858c7", dashed: false },
  {
    model: "GR00T N1.7",
    task: "Compositional",
    color: "#2858c7",
    dashed: true,
  },
  { model: "π0.5", task: "Atomic", color: "#9b5c37", dashed: false },
  { model: "π0.5", task: "Compositional", color: "#9b5c37", dashed: true },
];
const categories = [
  { id: "loco", name: "Locomotion", description: "Walking to a root target" },
  {
    id: "mani",
    name: "Stationary reaching",
    description: "Reaching a palm target from a stationary start",
  },
  {
    id: "loco_mani",
    name: "Locomotion + reaching",
    description: "Walking while reaching a shared palm target",
  },
];
const models = [
  { id: "pretrained", name: "Pretrained" },
  { id: "lora", name: "LoRA" },
  { id: "full", name: "Full fine-tuning" },
];

function enhanceDataScale(host) {
  if (!host || host.dataset.enhanced === "true") return;
  host.dataset.enhanced = "true";
  let selected = "Controller mean";
  host.innerHTML = `
    <div class="transfer-scale-controls" role="group" aria-label="Controller view">
      ${scaleViews.map((view, index) => `<button type="button" data-scale-view="${escape(view)}" aria-pressed="${index === 0}">${view === "Controller mean" ? "Five-controller mean" : escape(view)}</button>`).join("")}
    </div>
    <p class="transfer-scale-context" id="transfer-scale-context"></p>
    <div class="transfer-scale-legend" aria-label="Chart series">
      ${scaleSeries.map((series) => `<span style="--transfer-series:${series.color}"><i class="${series.dashed ? "is-dashed" : ""}" aria-hidden="true"></i>${escape(series.model)} · ${series.task}</span>`).join("")}
    </div>
    <figure class="transfer-scale-figure">
      <svg viewBox="0 0 850 375" role="img" aria-labelledby="transfer-scale-title transfer-scale-description"></svg>
      <figcaption id="transfer-scale-caption"></figcaption>
    </figure>
    <div class="transfer-study-note"><p>Five atomic and five compositional tasks; separate checkpoints, with 100 evaluation episodes each. Training updates scale with the demonstration count, so this is a joint data-and-training-budget comparison.</p></div>
    <div class="transfer-scale-footer">
      <details class="transfer-details"><summary>Exact values for this view</summary><div class="transfer-table-scroll" tabindex="0" role="region" aria-label="Demonstration scale success rates"><table class="transfer-table"><caption class="sr-only">Success rate in percent by demonstrations per task.</caption><thead></thead><tbody></tbody></table></div></details>
      <a class="text-link" href="./media/results/data-scale.csv" download>Fig. 4 data <span aria-hidden="true">↓</span></a>
    </div>
    <p class="sr-only transfer-scale-status" role="status" aria-live="polite"></p>`;

  const svg = host.querySelector("svg");
  function draw() {
    const points = dataScalePoints.filter((point) => point.panel === selected);
    const budgets = selected === "SONIC" ? [10, 30, 50, 100] : [10, 30, 50];
    const maxBudget = budgets.at(-1);
    const x = (budget) => 64 + ((budget - 10) / (maxBudget - 10)) * 700;
    const y = (value) => 303 - value * 2.4;
    const seriesPoints = scaleSeries.map((series) =>
      points.filter(
        (point) =>
          point.model === series.model && point.task_class === series.task,
      ),
    );
    const textDescription = seriesPoints
      .map(
        (rows, index) =>
          `${scaleSeries[index].model}, ${scaleSeries[index].task}: ${rows.map((row) => `${row.success_rate.toFixed(1)} percent at ${row.demos_per_task} demonstrations`).join("; ")}.`,
      )
      .join(" ");
    svg.innerHTML = `
      <title id="transfer-scale-title">${escape(selected)}: success rate versus demonstrations per task</title>
      <desc id="transfer-scale-description">${escape(textDescription)} Exact values are also available in the table below.</desc>
      ${selected === "SONIC" ? `<rect x="${x(50)}" y="55" width="${x(100) - x(50)}" height="248" class="transfer-scale-extension"/><text x="${(x(50) + x(100)) / 2}" y="43" text-anchor="middle" class="transfer-chart-note">SONIC-only budget extension</text>` : ""}
      ${[0, 25, 50, 75, 100].map((tick) => `<line x1="64" x2="764" y1="${y(tick)}" y2="${y(tick)}" class="transfer-chart-grid"/><text x="49" y="${y(tick) + 4}" text-anchor="end" class="transfer-chart-tick">${tick}</text>`).join("")}
      <text x="64" y="25" class="transfer-chart-axis">Success rate (%)</text>
      ${budgets.map((budget) => `<line x1="${x(budget)}" x2="${x(budget)}" y1="303" y2="309" class="transfer-chart-axis-line"/><text x="${x(budget)}" y="331" text-anchor="middle" class="transfer-chart-tick">${budget}</text>`).join("")}
      <text x="414" y="365" text-anchor="middle" class="transfer-chart-axis">Demonstrations per task</text>
      ${seriesPoints
        .map((rows, index) => {
          const series = scaleSeries[index];
          return `<g style="--transfer-series:${series.color}"><polyline points="${rows.map((row) => `${x(row.demos_per_task)},${y(row.success_rate)}`).join(" ")}" class="transfer-chart-series ${series.dashed ? "is-dashed" : ""}"/>
          ${rows
            .map((row) => {
              const cx = x(row.demos_per_task);
              const cy = y(row.success_rate);
              const title = `<title>${escape(series.model)} · ${series.task}: ${row.success_rate.toFixed(1)}% at ${row.demos_per_task} demonstrations per task</title>`;
              return series.dashed
                ? `<path d="M${cx},${cy - 5}L${cx + 5},${cy}L${cx},${cy + 5}L${cx - 5},${cy}Z" class="transfer-chart-marker is-hollow">${title}</path>`
                : `<circle cx="${cx}" cy="${cy}" r="4" class="transfer-chart-marker">${title}</circle>`;
            })
            .join("")}</g>`;
        })
        .join("")}`;

    host.querySelectorAll("[data-scale-view]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.scaleView === selected),
      );
    });
    host.querySelector("#transfer-scale-context").textContent =
      selected === "Controller mean"
        ? "Equal-weight mean across five controllers · shared budgets only"
        : `${selected} · 100 evaluation episodes per policy and task category`;
    host.querySelector("#transfer-scale-caption").textContent =
      selected === "Controller mean"
        ? "GR00T’s mean atomic success rises from 33.0% to 69.8%; its compositional success levels off between 30 and 50 demonstrations. SONIC’s 100-demonstration extension is excluded from this mean."
        : selected === "SONIC"
          ? "Only SONIC includes 100 demonstrations per task. Gains at this larger budget vary by policy and task category."
          : "Atomic and compositional curves use separately trained checkpoints on the same five-task sets at each budget.";
    host.querySelector("thead").innerHTML =
      `<tr><th scope="col">Policy / tasks</th>${budgets.map((budget) => `<th scope="col">${budget} demos</th>`).join("")}</tr>`;
    host.querySelector("tbody").innerHTML = seriesPoints
      .map(
        (rows, index) =>
          `<tr><th scope="row">${escape(scaleSeries[index].model)} · ${scaleSeries[index].task}</th>${rows.map((row) => `<td>${row.success_rate.toFixed(1)}%</td>`).join("")}</tr>`,
      )
      .join("");
    host.querySelector(".transfer-scale-status").textContent =
      `${selected} chart and exact values updated.`;
  }
  host.querySelectorAll("[data-scale-view]").forEach((button) => {
    button.addEventListener("click", () => {
      selected = button.dataset.scaleView;
      draw();
    });
  });
  draw();
}

function fullTestMarkup() {
  return `<details class="transfer-details transfer-full-test"><summary>Full reported test results · Table V</summary>
    <p class="transfer-table-note">Task success: 30 task–scene pairs, with 10 trials per pair and model. These tasks differ from the 30 selected open-space clips above.</p>
    <div class="transfer-table-scroll" tabindex="0" role="region" aria-label="Kimodo full task success results"><table class="transfer-table"><caption>Task success (%) ↑</caption><thead><tr><th scope="col">Task group</th>${models.map((model) => `<th scope="col">${model.name}</th>`).join("")}</tr></thead><tbody>${kimodoAggregate.success.map((row) => `<tr><th scope="row">${escape(row.task_group)}</th>${models.map((model) => `<td>${Number(row[model.id]).toFixed(1)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <p class="transfer-table-note">Goal reaching: 198 fixed conditions per model (54 locomotion, 72 stationary reaching, 72 combined). Mean ± sample standard deviation after 3 seconds of execution; target ranges overlap adaptation conditions.</p>
    <div class="transfer-table-scroll" tabindex="0" role="region" aria-label="Kimodo full goal error results"><table class="transfer-table"><caption>Executed goal error (m) ↓</caption><thead><tr><th scope="col">Condition / target</th>${models.map((model) => `<th scope="col">${model.name}</th>`).join("")}</tr></thead><tbody>${kimodoAggregate.goalError.map((row) => `<tr><th scope="row">${escape(row.condition)} · ${escape(row.target)}</th>${models.map((model) => `<td>${Number(row[`${model.id}_mean_m`]).toFixed(3)} ± ${Number(row[`${model.id}_sd_m`]).toFixed(3)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <p class="transfer-table-note">Stationary root error measures base movement from the initial position; small adjustments may help the hand reach its target. Full fine-tuning has the lowest mean in four of the five goal-error measures.</p>
  </details>`;
}

function enhanceOpenSpace(host) {
  if (!host || host.dataset.enhanced === "true") return;
  host.dataset.enhanced = "true";
  let categoryId = "loco_mani";
  let caseIndex = 0;
  let playbackGeneration = 0;
  const selectedCase = () =>
    openSpaceCases.filter((item) => item.category === categoryId)[caseIndex];
  host.innerHTML = `
    <div class="transfer-study-heading"><div><p class="eyebrow">MOTION GENERATOR · FIG. 5</p><h2 id="open-space-title">Kimodo, adapted for execution.</h2></div><p>Compare Pretrained, LoRA and full fine-tuning under the same frozen SONIC v1.1 controller. Explore selected motions alongside the paper’s complete test results.</p></div>
    <div class="transfer-success-summary" aria-label="Overall Kimodo task success on 30 task-scene pairs">${models.map((model) => `<div><span>${model.name}</span><strong>${Number(kimodoAggregate.success[0][model.id]).toFixed(1)}<small>%</small></strong></div>`).join("")}</div>
    <p class="transfer-summary-note">Overall task success · 30 task–scene pairs × 10 trials per model · Table V(a)</p>
    <div class="transfer-category-controls" role="group" aria-label="Open-space motion category">${categories.map((category) => `<button type="button" data-open-category="${category.id}" aria-pressed="${category.id === categoryId}">${category.name}<span>10 selected cases</span></button>`).join("")}</div>
    <div class="transfer-case-toolbar"><div><p id="open-space-case-heading"></p><span id="open-space-case-scope"></span></div><label for="open-space-case">Selected case<select id="open-space-case"></select></label></div>
    <figure class="transfer-open-figure"><div class="transfer-video-stage"><video id="open-space-video" playsinline muted preload="none" aria-label="Pretrained, LoRA and full fine-tuning motion comparison" aria-describedby="open-space-video-caption"></video><button type="button" class="transfer-video-play"><span aria-hidden="true">▶</span>Play comparison</button></div><figcaption id="open-space-video-caption">Left to right: Pretrained · LoRA · Full fine-tuning. Each clip compares the same spatial goal.</figcaption></figure>
    <p class="transfer-video-status" role="status" aria-live="polite"></p>
    <div class="transfer-case-results"><div><h3>Final goal error <span>(m) ↓</span></h3><p id="open-space-metric-note"></p></div><div class="transfer-table-scroll" tabindex="0" role="region" aria-label="Selected case goal errors"><table class="transfer-table transfer-case-table"><caption class="sr-only">Final goal error in metres for this selected case.</caption><thead><tr><th scope="col">Target</th>${models.map((model) => `<th scope="col">${model.name}</th>`).join("")}</tr></thead><tbody></tbody></table></div></div>
    <p class="transfer-selection-note">These 30 qualitative examples were selected for a full fine-tuning advantage of at least 0.05 m over both alternatives on each primary metric. They are selected cases, not full-test averages.</p>
    <div class="transfer-open-footer">${fullTestMarkup()}<a class="text-link" href="./media/results/open-space/manifest.json" download>Case data <span aria-hidden="true">↓</span></a></div>`;

  const video = host.querySelector("video");
  const playButton = host.querySelector(".transfer-video-play");
  const caseSelect = host.querySelector("#open-space-case");
  const status = host.querySelector(".transfer-video-status");

  function pause() {
    playbackGeneration++;
    video.pause();
  }
  function renderCase() {
    pause();
    const item = selectedCase();
    const category = categories.find((entry) => entry.id === categoryId);
    if (video.hasAttribute("src")) {
      video.removeAttribute("src");
      video.load();
    }
    video.controls = false;
    video.poster = item.poster;
    video.setAttribute(
      "aria-label",
      `${category.name}, ${item.label}: Pretrained, LoRA and full fine-tuning`,
    );
    playButton.hidden = false;
    playButton.disabled = false;
    status.textContent = "";
    caseSelect.innerHTML = openSpaceCases
      .filter((entry) => entry.category === categoryId)
      .map(
        (entry, index) =>
          `<option value="${index}"${index === caseIndex ? " selected" : ""}>${String(index + 1).padStart(2, "0")} · ${escape(entry.label)}</option>`,
      )
      .join("");
    host
      .querySelectorAll("[data-open-category]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.openCategory === categoryId),
        ),
      );
    host.querySelector("#open-space-case-heading").textContent =
      category.description;
    host.querySelector("#open-space-case-scope").textContent =
      `Case ${caseIndex + 1} of 10 · ${item.label} · ${item.duration.toFixed(2)} s clip`;
    host.querySelector("#open-space-metric-note").textContent =
      categoryId === "mani"
        ? "Palm error is the primary metric. Root error shows base displacement; small adjustments can support reaching."
        : categoryId === "loco"
          ? "Planar distance between the executed root position and its goal."
          : "Planar root error and 3-D palm error for this individual condition.";
    const metrics = categoryId === "loco" ? ["root"] : ["root", "palm"];
    host.querySelector(".transfer-case-table tbody").innerHTML = metrics
      .map(
        (metric) =>
          `<tr><th scope="row">${metric === "root" ? "Root" : "Palm"}</th>${models.map((model) => `<td${model.id === "full" && !(categoryId === "mani" && metric === "root") ? ' class="transfer-best"' : ""}>${item.metrics[model.id][metric].toFixed(3)}</td>`).join("")}</tr>`,
      )
      .join("");
  }

  host.querySelectorAll("[data-open-category]").forEach((button) =>
    button.addEventListener("click", () => {
      categoryId = button.dataset.openCategory;
      caseIndex = 0;
      renderCase();
    }),
  );
  caseSelect.addEventListener("change", () => {
    caseIndex = Number(caseSelect.value);
    renderCase();
  });
  playButton.addEventListener("click", async () => {
    const item = selectedCase();
    const generation = ++playbackGeneration;
    video.src = item.video;
    video.controls = true;
    playButton.hidden = true;
    status.textContent = "";
    try {
      await video.play();
      if (generation !== playbackGeneration) video.pause();
    } catch (error) {
      if (generation !== playbackGeneration || error.name === "AbortError")
        return;
      playButton.hidden = false;
      status.textContent =
        "Playback could not start. Select Play comparison to try again.";
    }
  });
  video.addEventListener("error", () => {
    if (!video.hasAttribute("src")) return;
    playButton.hidden = false;
    status.textContent =
      "This clip could not load. Select Play comparison to retry.";
  });
  // User-initiated playback only. Leaving the viewport or tab never starts it again.
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) pause();
    });
    observer.observe(video);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });
  document.addEventListener(
    "play",
    (event) => {
      if (event.target !== video && event.target instanceof HTMLMediaElement)
        pause();
    },
    true,
  );
  renderCase();
}

/** Enhance either supplied host; safe to call once or after deferred insertion. */
export function enhanceTransferStudies() {
  enhanceDataScale(document.getElementById("data-scaling-study"));
  enhanceOpenSpace(document.getElementById("open-space-study"));
}
