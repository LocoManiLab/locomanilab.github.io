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
  const state = {
    model: "GR00T N1.7",
    task: "Atomic",
    controller: "Controller mean",
    budget: 50,
  };
  const palettes = {
    "GR00T N1.7": ["#2858c7", "#067c80"],
    "π0.5": ["#ad5c25", "#7853b5"],
  };
  const tasks = ["Atomic", "Compositional"];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const budgets = () =>
    state.controller === "SONIC" ? [10, 30, 50, 100] : [10, 30, 50];
  const rowsFor = (task, model = state.model) =>
    dataScalePoints.filter(
      (row) =>
        row.panel === state.controller &&
        row.model === model &&
        row.task_class === task,
    );
  const pointFor = (task, budget = state.budget) =>
    rowsFor(task).find((row) => row.demos_per_task === budget);
  host.innerHTML = `
    <div class="transfer-scale-workbench">
      <div class="transfer-scale-toolbar">
        <fieldset class="transfer-model-choice"><legend>Policy</legend><div>${Object.keys(
          palettes,
        )
          .map(
            (model, index) =>
              `<button type="button" data-scale-model="${escape(model)}" aria-pressed="${index === 0}">${escape(model)}</button>`,
          )
          .join("")}</div></fieldset>
        <label class="transfer-controller-choice" for="transfer-scale-controller">Execution controller<select id="transfer-scale-controller">${scaleViews.map((view) => `<option value="${escape(view)}">${view === "Controller mean" ? "Five-controller mean" : escape(view)}</option>`).join("")}</select></label>
      </div>
      <div class="transfer-scale-chart-heading"><p id="transfer-scale-context"></p><div class="transfer-task-controls" role="group" aria-label="Task category in focus">${tasks.map((task, index) => `<button type="button" data-scale-task="${task}" aria-pressed="${index === 0}"><i aria-hidden="true"></i>${task}<span data-scale-task-value="${task}"></span></button>`).join("")}</div></div>
      <figure class="transfer-scale-figure">
        <div class="transfer-scale-canvas"><svg viewBox="0 0 960 395" role="group" aria-labelledby="transfer-scale-title transfer-scale-description">
          <title id="transfer-scale-title"></title><desc id="transfer-scale-description"></desc>
          <defs><linearGradient id="transfer-scale-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--scale-main)" stop-opacity=".14"/><stop offset="100%" stop-color="var(--scale-main)" stop-opacity=".01"/></linearGradient></defs>
          <g class="transfer-scale-grid" aria-hidden="true"></g>
          <path class="transfer-chart-area" aria-hidden="true"/>
          <g class="transfer-scale-curves" aria-hidden="true">${tasks.map((task, index) => `<path data-scale-curve="${task}" class="transfer-chart-series ${index ? "is-dashed" : ""}"/>`).join("")}</g>
          <line class="transfer-checkpoint-line" y1="52" y2="315" aria-hidden="true"/>
          <g class="transfer-scale-markers"></g>
        </svg><div class="transfer-scale-tooltip" role="tooltip" hidden></div></div>
        <figcaption id="transfer-scale-caption">Choose a task category, then inspect a checkpoint. Hover or focus a marker for the exact result.</figcaption>
      </figure>
      <div class="transfer-checkpoint-controls"><div class="transfer-checkpoint-label"><span>Training checkpoint</span><strong><output id="transfer-budget-output">50</output><small> demos / task</small></strong></div><div class="transfer-budget-scrubber"><input id="transfer-scale-budget" type="range" min="0" max="2" value="2" step="1" aria-label="Demonstrations per task" aria-describedby="transfer-budget-scope"/><div class="transfer-budget-options" role="group" aria-label="Available demonstration budgets"></div></div></div>
      <div class="transfer-scale-insights" aria-live="off"><article class="transfer-primary-insight"><span>Success at this checkpoint</span><strong id="transfer-checkpoint-rate"></strong><p id="transfer-checkpoint-task"></p></article><article><span>Change from 10 demos</span><strong id="transfer-checkpoint-gain"></strong><p id="transfer-checkpoint-baseline"></p></article><article><span>Atomic–compositional gap</span><strong id="transfer-checkpoint-gap"></strong><p id="transfer-checkpoint-comparison"></p></article></div>
      <p id="transfer-budget-scope" class="transfer-budget-scope"></p>
    </div>
    <div class="transfer-study-note"><p>Separate checkpoints cover five atomic or five compositional tasks, with 100 evaluation episodes per checkpoint. More demonstrations also mean more training updates; the curves compare both data and training budget.</p></div>
    <div class="transfer-scale-footer"><details class="transfer-details"><summary>Exact values for this view</summary><div class="transfer-table-scroll" tabindex="0" role="region" aria-label="Demonstration scale success rates"><table class="transfer-table"><caption class="sr-only">Success rate in percent by demonstrations per task, for both policies.</caption><thead></thead><tbody></tbody></table></div></details><a class="text-link" href="./media/results/data-scale.csv" download>Download curve data <span aria-hidden="true">↓</span></a></div>
    <p class="sr-only transfer-scale-status" role="status" aria-live="polite"></p>`;
  const svg = host.querySelector("svg");
  const tooltip = host.querySelector(".transfer-scale-tooltip");
  const slider = host.querySelector("#transfer-scale-budget");
  let chartWidth = host.clientWidth < 600 ? 500 : 960;
  const x = (budget) =>
    70 + ((budget - 10) / (budgets().at(-1) - 10)) * (chartWidth - 154);
  const y = (value) => 315 - value * 2.5;
  let animation;
  let curveCoordinates = null;
  let pointerInside = false;

  function hideTooltip() {
    tooltip.hidden = true;
  }
  function showTooltip(marker) {
    if (!marker) return;
    const task = marker.dataset.scalePointTask;
    const budget = Number(marker.dataset.scalePointBudget);
    const row = pointFor(task, budget);
    const canvas = host.querySelector(".transfer-scale-canvas");
    const bounds = canvas.getBoundingClientRect();
    tooltip.innerHTML = `<span>${escape(task)} · ${budget} demos / task</span><strong>${row.success_rate.toFixed(1)}<small>% success</small></strong>`;
    tooltip.hidden = false;
    const left = Math.max(
      8,
      Math.min(
        bounds.width - tooltip.offsetWidth - 8,
        (x(budget) / chartWidth) * bounds.width - tooltip.offsetWidth / 2,
      ),
    );
    const top = Math.max(
      6,
      (y(row.success_rate) / 395) * bounds.height - tooltip.offsetHeight - 18,
    );
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }
  const path = (coordinates) =>
    coordinates
      .map(
        ([cx, cy], index) =>
          `${index ? "L" : "M"}${cx.toFixed(2)},${cy.toFixed(2)}`,
      )
      .join(" ");
  function setCurves(coordinates) {
    curveCoordinates = coordinates;
    tasks.forEach((task, index) =>
      host
        .querySelector(`[data-scale-curve="${task}"]`)
        .setAttribute("d", path(coordinates[index])),
    );
    const selected = coordinates[tasks.indexOf(state.task)];
    host
      .querySelector(".transfer-chart-area")
      .setAttribute(
        "d",
        `${path(selected)}L${selected.at(-1)[0]},315L${selected[0][0]},315Z`,
      );
  }
  function animateCurves(next) {
    cancelAnimationFrame(animation);
    if (!curveCoordinates || reducedMotion.matches) {
      setCurves(next);
      return;
    }
    const previous = curveCoordinates.map((coordinates) =>
      coordinates.map((point) => [...point]),
    );
    const started = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - started) / 360);
      const eased = 1 - (1 - progress) ** 3;
      setCurves(
        next.map((coordinates, series) =>
          coordinates.map(([cx, cy], point) => [
            previous[series][point][0] +
              (cx - previous[series][point][0]) * eased,
            previous[series][point][1] +
              (cy - previous[series][point][1]) * eased,
          ]),
        ),
      );
      if (progress < 1) animation = requestAnimationFrame(frame);
    }
    animation = requestAnimationFrame(frame);
  }
  function updateCheckpoint(announce = true) {
    const available = budgets();
    const active = pointFor(state.task);
    const initial = pointFor(state.task, 10);
    const atomic = pointFor("Atomic");
    const compositional = pointFor("Compositional");
    const gain = active.success_rate - initial.success_rate;
    const gap = atomic.success_rate - compositional.success_rate;
    host.style.setProperty(
      "--scale-main",
      palettes[state.model][tasks.indexOf(state.task)],
    );
    host.querySelectorAll("[data-scale-task]").forEach((button, index) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.scaleTask === state.task),
      );
      button.style.setProperty(
        "--transfer-series",
        palettes[state.model][index],
      );
      button.querySelector("span").textContent =
        `${pointFor(button.dataset.scaleTask).success_rate.toFixed(1)}%`;
    });
    tasks.forEach((task, index) => {
      const curve = host.querySelector(`[data-scale-curve="${task}"]`);
      curve.style.setProperty(
        "--transfer-series",
        palettes[state.model][index],
      );
      curve.classList.toggle("is-muted", task !== state.task);
    });
    host.querySelectorAll("[data-scale-point-budget]").forEach((marker) => {
      const selected =
        Number(marker.dataset.scalePointBudget) === state.budget &&
        marker.dataset.scalePointTask === state.task;
      marker.setAttribute("aria-pressed", String(selected));
      marker.classList.toggle("is-selected", selected);
      marker.classList.toggle(
        "is-muted",
        marker.dataset.scalePointTask !== state.task,
      );
    });
    const checkpointLine = host.querySelector(".transfer-checkpoint-line");
    checkpointLine.setAttribute("x1", x(state.budget));
    checkpointLine.setAttribute("x2", x(state.budget));
    host.querySelector("#transfer-budget-output").textContent = state.budget;
    slider.max = available.length - 1;
    slider.value = available.indexOf(state.budget);
    slider.setAttribute(
      "aria-valuetext",
      `${state.budget} demonstrations per task, ${active.success_rate.toFixed(1)} percent ${state.task.toLowerCase()} success`,
    );
    host
      .querySelectorAll("[data-scale-budget]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(Number(button.dataset.scaleBudget) === state.budget),
        ),
      );
    host.querySelector("#transfer-checkpoint-rate").innerHTML =
      `${active.success_rate.toFixed(1)}<small>%</small>`;
    host.querySelector("#transfer-checkpoint-task").textContent =
      `${state.model} · ${state.task}`;
    host.querySelector("#transfer-checkpoint-gain").innerHTML =
      `${gain > 0 ? "+" : gain < 0 ? "−" : ""}${Math.abs(gain).toFixed(1)}<small> pp</small>`;
    host.querySelector("#transfer-checkpoint-baseline").textContent =
      `${initial.success_rate.toFixed(1)}% → ${active.success_rate.toFixed(1)}% success`;
    host.querySelector("#transfer-checkpoint-gap").innerHTML =
      `${gap < 0 ? "−" : ""}${Math.abs(gap).toFixed(1)}<small> pp</small>`;
    host.querySelector("#transfer-checkpoint-comparison").textContent =
      `${atomic.success_rate.toFixed(1)}% atomic · ${compositional.success_rate.toFixed(1)}% compositional`;
    const area = host.querySelector(".transfer-chart-area");
    if (curveCoordinates) {
      const selected = curveCoordinates[tasks.indexOf(state.task)];
      area.setAttribute(
        "d",
        `${path(selected)}L${selected.at(-1)[0]},315L${selected[0][0]},315Z`,
      );
    }
    if (announce)
      host.querySelector(".transfer-scale-status").textContent =
        `${state.model}, ${state.controller}, ${state.task}: ${active.success_rate.toFixed(1)} percent success at ${state.budget} demonstrations per task.`;
  }
  function draw() {
    hideTooltip();
    svg.setAttribute("viewBox", `0 0 ${chartWidth} 395`);
    const available = budgets();
    if (!available.includes(state.budget)) state.budget = available.at(-1);
    host.dataset.scaleController = state.controller;
    host.dataset.scaleModel = state.model;
    host
      .querySelectorAll("[data-scale-model]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.scaleModel === state.model),
        ),
      );
    host.querySelector("#transfer-scale-title").textContent =
      `${state.model} with ${state.controller}: success versus demonstrations per task`;
    host.querySelector("#transfer-scale-description").textContent =
      tasks
        .map(
          (task) =>
            `${task}: ${rowsFor(task)
              .map(
                (row) =>
                  `${row.success_rate.toFixed(1)} percent at ${row.demos_per_task} demonstrations`,
              )
              .join("; ")}.`,
        )
        .join(" ") +
      " Focus or activate a marker to inspect that checkpoint. Exact values for both policies are in the table below.";
    host.querySelector(".transfer-scale-grid").innerHTML = `
      ${state.controller === "SONIC" ? `<rect x="${x(50)}" y="52" width="${x(100) - x(50)}" height="263" class="transfer-scale-extension"/><text x="${(x(50) + x(100)) / 2}" y="39" text-anchor="middle" class="transfer-chart-note">SONIC-only extension</text>` : ""}
      ${[0, 25, 50, 75, 100].map((tick) => `<line x1="70" x2="${chartWidth - 84}" y1="${y(tick)}" y2="${y(tick)}" class="transfer-chart-grid"/><text x="51" y="${y(tick) + 5}" text-anchor="end" class="transfer-chart-tick">${tick}</text>`).join("")}
      <text x="70" y="27" class="transfer-chart-axis">Success rate (%)</text>
      ${available.map((budget) => `<text x="${x(budget)}" y="346" text-anchor="middle" class="transfer-chart-tick">${budget}</text>`).join("")}
      <text x="${(70 + chartWidth - 84) / 2}" y="383" text-anchor="middle" class="transfer-chart-axis">Demonstrations per task</text>`;
    host.querySelector(".transfer-scale-markers").innerHTML = tasks
      .map((task, index) =>
        rowsFor(task)
          .map(
            (row) =>
              `<g class="transfer-chart-point" data-scale-point-task="${task}" data-scale-point-budget="${row.demos_per_task}" transform="translate(${x(row.demos_per_task)} ${y(row.success_rate)})" style="--transfer-series:${palettes[state.model][index]}" role="button" tabindex="0" aria-pressed="false" aria-label="${escape(state.model)}, ${task}, ${row.demos_per_task} demonstrations: ${row.success_rate.toFixed(1)} percent success"><circle r="19" class="transfer-chart-hit"/><circle r="10" class="transfer-chart-halo"/>${index ? '<path d="M0,-5L5,0L0,5L-5,0Z" class="transfer-chart-marker is-hollow"/>' : '<circle r="5" class="transfer-chart-marker"/>'}</g>`,
          )
          .join(""),
      )
      .join("");
    const coordinates = tasks.map((task) => {
      const result = rowsFor(task).map((row) => [
        x(row.demos_per_task),
        y(row.success_rate),
      ]);
      while (result.length < 4) result.push([...result.at(-1)]);
      return result;
    });
    animateCurves(coordinates);
    host.querySelector("#transfer-scale-context").textContent =
      state.controller === "Controller mean"
        ? "Five controllers, weighted equally"
        : `${state.controller} execution`;
    host.querySelector("#transfer-budget-scope").textContent =
      state.controller === "Controller mean"
        ? "Shared budgets: 10, 30 and 50 demonstrations. SONIC’s extra 100-demo checkpoint is excluded from this mean."
        : state.controller === "SONIC"
          ? "SONIC includes a 100-demo extension. Larger budgets do not improve every policy and task category."
          : "Shared budgets: 10, 30 and 50 demonstrations per task. Each point uses 100 evaluation episodes.";
    host.querySelector(".transfer-budget-options").innerHTML = available
      .map(
        (budget) =>
          `<button type="button" data-scale-budget="${budget}" aria-pressed="false">${budget}<span class="sr-only"> demonstrations per task</span></button>`,
      )
      .join("");
    host.querySelector("thead").innerHTML =
      `<tr><th scope="col">Policy / tasks</th>${available.map((budget) => `<th scope="col">${budget} demos</th>`).join("")}</tr>`;
    host.querySelector("tbody").innerHTML = scaleSeries
      .map(
        (series) =>
          `<tr><th scope="row">${escape(series.model)} · ${series.task}</th>${rowsFor(
            series.task,
            series.model,
          )
            .map((row) => `<td>${row.success_rate.toFixed(1)}%</td>`)
            .join("")}</tr>`,
      )
      .join("");
    updateCheckpoint();
  }
  host.querySelectorAll("[data-scale-model]").forEach((button) =>
    button.addEventListener("click", () => {
      state.model = button.dataset.scaleModel;
      draw();
    }),
  );
  host
    .querySelector("#transfer-scale-controller")
    .addEventListener("change", (event) => {
      state.controller = event.target.value;
      draw();
    });
  host.querySelectorAll("[data-scale-task]").forEach((button) =>
    button.addEventListener("click", () => {
      state.task = button.dataset.scaleTask;
      updateCheckpoint();
    }),
  );
  slider.addEventListener("input", () => {
    state.budget = budgets()[Number(slider.value)];
    updateCheckpoint(false);
  });
  slider.addEventListener("change", () => updateCheckpoint());
  host
    .querySelector(".transfer-budget-options")
    .addEventListener("click", (event) => {
      const button = event.target.closest("[data-scale-budget]");
      if (button) {
        state.budget = Number(button.dataset.scaleBudget);
        updateCheckpoint();
      }
    });
  function chooseMarker(marker) {
    state.task = marker.dataset.scalePointTask;
    state.budget = Number(marker.dataset.scalePointBudget);
    updateCheckpoint();
    showTooltip(marker);
  }
  svg.addEventListener("click", (event) => {
    const marker = event.target.closest("[data-scale-point-budget]");
    if (marker) chooseMarker(marker);
  });
  svg.addEventListener("pointerover", (event) => {
    const marker = event.target.closest("[data-scale-point-budget]");
    if (marker) {
      pointerInside = true;
      showTooltip(marker);
    }
  });
  svg.addEventListener("pointerout", (event) => {
    if (event.target.closest("[data-scale-point-budget]")) {
      pointerInside = false;
      if (!svg.contains(document.activeElement)) hideTooltip();
    }
  });
  svg.addEventListener("focusin", (event) =>
    showTooltip(event.target.closest("[data-scale-point-budget]")),
  );
  svg.addEventListener("focusout", () => {
    if (!pointerInside) hideTooltip();
  });
  svg.addEventListener("keydown", (event) => {
    const marker = event.target.closest("[data-scale-point-budget]");
    if (!marker) return;
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      chooseMarker(marker);
    }
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const available = budgets();
      let index = available.indexOf(Number(marker.dataset.scalePointBudget));
      index =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? available.length - 1
            : Math.max(
                0,
                Math.min(
                  available.length - 1,
                  index + (event.key === "ArrowRight" ? 1 : -1),
                ),
              );
      const next = host.querySelector(
        `[data-scale-point-task="${marker.dataset.scalePointTask}"][data-scale-point-budget="${available[index]}"]`,
      );
      next.focus();
      chooseMarker(next);
    }
    if (event.key === "Escape") hideTooltip();
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      cancelAnimationFrame(animation);
      curveCoordinates = null;
      draw();
    }
  });
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      const nextWidth = host.clientWidth < 600 ? 500 : 960;
      if (nextWidth !== chartWidth) {
        chartWidth = nextWidth;
        curveCoordinates = null;
        draw();
      }
    }).observe(host);
  }
  draw();
}

function fullTestMarkup() {
  return `<details class="transfer-details transfer-full-test"><summary>Full reported test results</summary>
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
  let announcedPlaying = false;
  const selectedCase = () =>
    openSpaceCases.filter((item) => item.category === categoryId)[caseIndex];
  host.innerHTML = `
    <div class="transfer-study-heading"><div><p class="eyebrow">MOTION GENERATOR</p><h3 id="open-space-title">Kimodo, adapted for execution.</h3></div><p>Compare Pretrained, LoRA and full fine-tuning under the same frozen SONIC v1.1 controller. Explore selected motions alongside the paper’s complete test results.</p></div>
    <div class="transfer-success-summary" aria-label="Overall Kimodo task success on 30 task-scene pairs">${models.map((model) => `<div><span>${model.name}</span><strong>${Number(kimodoAggregate.success[0][model.id]).toFixed(1)}<small>%</small></strong></div>`).join("")}</div>
    <p class="transfer-summary-note">Overall task success · 30 task–scene pairs × 10 trials per model</p>
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
  video.dataset.playing = "false";

  function publishPlayback(playing = !video.paused && !video.ended) {
    video.dataset.playing = String(playing);
    if (announcedPlaying === playing) return;
    announcedPlaying = playing;
    document.dispatchEvent(
      new CustomEvent("open-space-playback", { detail: { playing } }),
    );
  }
  for (const event of ["play", "pause", "ended"])
    video.addEventListener(event, () => publishPlayback());

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
    publishPlayback(false);
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
      if (
        event.target !== video &&
        event.target instanceof HTMLMediaElement &&
        !event.target.matches("[data-preview]") &&
        !event.target.paused &&
        !event.target.ended
      )
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
