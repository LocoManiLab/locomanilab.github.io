import {
  dataScalePoints,
  openSpaceCases,
  kimodoAggregate,
} from "./transfer-studies-data.js?v=20261017-results";
import { organizationLogos } from "./stack-data.js?v=20261017-results";

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
  const state = { task: "Atomic", controller: "Controller mean", budget: 50 };
  const policies = [
    {
      model: "GR00T N1.7",
      label: "GR00T N1.7",
      id: "groot",
      organization: "nvidia",
      colors: ["#2858c7", "#067c80"],
    },
    {
      model: "π0.5",
      label: "π₀.₅",
      id: "pi05",
      organization: "pi",
      colors: ["#ad5c25", "#7853b5"],
    },
  ];
  const tasks = ["Atomic", "Compositional"];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const budgets = () =>
    state.controller === "SONIC" ? [10, 30, 50, 100] : [10, 30, 50];
  const rowsFor = (task, model) =>
    dataScalePoints.filter(
      (row) =>
        row.panel === state.controller &&
        row.model === model &&
        row.task_class === task,
    );
  const pointFor = (model, task, budget = state.budget) =>
    rowsFor(task, model).find((row) => row.demos_per_task === budget);
  const chartWidth = 500;
  const x = (budget) => 54 + ((budget - 10) / (budgets().at(-1) - 10)) * 410;
  const y = (value) => 305 - value * 2.4;

  host.innerHTML = `
    <div class="transfer-scale-workbench">
      <div class="transfer-scale-toolbar"><fieldset class="transfer-controller-choice"><legend>Execution controller</legend><div>${scaleViews.map((view, index) => `<button type="button" data-scale-controller="${escape(view)}" aria-pressed="${index === 0}">${view === "Controller mean" ? "Five-controller mean" : escape(view)}</button>`).join("")}</div></fieldset><span class="transfer-paired-scale-note">Shared axes · success 0–100%</span></div>
      <div class="transfer-scale-chart-heading"><p id="transfer-scale-context"></p><div class="transfer-task-controls" role="group" aria-label="Task category in focus">${tasks.map((task, index) => `<button type="button" data-scale-task="${task}" style="--transfer-series:${policies[0].colors[index]}" aria-pressed="${index === 0}"><i aria-hidden="true"></i>${task}</button>`).join("")}</div></div>
      <div class="transfer-policy-panels">${policies
        .map(
          (
            policy,
          ) => `<article class="transfer-scale-panel" data-scale-panel="${escape(policy.model)}" aria-labelledby="transfer-policy-${policy.id}">
        <div class="transfer-policy-heading"><h4 id="transfer-policy-${policy.id}"><span class="transfer-policy-logo" aria-hidden="true">${organizationLogos([policy.organization])}</span><span>${policy.label}</span></h4><div class="transfer-policy-legend" aria-label="${escape(policy.label)} chart series">${tasks.map((task, index) => `<span style="--transfer-series:${policy.colors[index]}"><i class="${index ? "is-dashed" : ""}" aria-hidden="true"></i>${task}<strong data-scale-legend-task="${task}"></strong></span>`).join("")}</div></div>
        <figure class="transfer-scale-figure"><div class="transfer-scale-canvas"><svg viewBox="0 0 500 370" role="group" aria-labelledby="transfer-scale-title-${policy.id} transfer-scale-description-${policy.id}">
          <title id="transfer-scale-title-${policy.id}"></title><desc id="transfer-scale-description-${policy.id}"></desc>
          <defs><linearGradient id="transfer-scale-fill-${policy.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--scale-main)" stop-opacity=".14"/><stop offset="100%" stop-color="var(--scale-main)" stop-opacity=".01"/></linearGradient></defs>
          <g class="transfer-scale-grid" aria-hidden="true"></g><path class="transfer-chart-area" style="fill:url(#transfer-scale-fill-${policy.id})" aria-hidden="true"/>
          <g class="transfer-scale-curves" aria-hidden="true">${tasks.map((task, index) => `<path data-scale-curve="${task}" class="transfer-chart-series ${index ? "is-dashed" : ""}"/>`).join("")}</g>
          <line class="transfer-checkpoint-line" y1="52" y2="305" aria-hidden="true"/><g class="transfer-scale-markers"></g>
        </svg><div class="transfer-scale-tooltip" role="tooltip" hidden></div></div><figcaption class="sr-only">${escape(policy.label)} success rates. Both policy panels share the same demonstration and success-rate scales.</figcaption></figure>
        <div class="transfer-scale-insights" aria-live="off"><article class="transfer-primary-insight"><span data-scale-rate-label>Atomic success</span><strong data-scale-rate></strong><p data-scale-checkpoint></p></article><article><span>Gain from 10 demos</span><strong data-scale-gain></strong><p data-scale-baseline></p></article><article><span>Task-category gap</span><strong data-scale-gap></strong><p data-scale-comparison></p></article></div>
      </article>`,
        )
        .join("")}</div>
      <p id="transfer-scale-caption" class="transfer-paired-hint">Compare both policies at the same checkpoint. Hover or focus a marker to inspect an exact result.</p>
      <div class="transfer-checkpoint-controls"><div class="transfer-checkpoint-label"><span>Shared training checkpoint</span><strong><output id="transfer-budget-output">50</output><small> demos / task</small></strong></div><div class="transfer-budget-scrubber"><input id="transfer-scale-budget" type="range" min="0" max="2" value="2" step="1" aria-label="Demonstrations per task for both policies" aria-describedby="transfer-budget-scope"/><div class="transfer-budget-options" role="group" aria-label="Available demonstration budgets"></div></div></div>
      <p id="transfer-budget-scope" class="transfer-budget-scope"></p>
    </div>
    <div class="transfer-study-note"><p>Separate checkpoints cover five atomic or five compositional tasks, with 100 evaluation episodes per checkpoint. More demonstrations also mean more training updates; the curves compare both data and training budget.</p></div>
    <div class="transfer-scale-footer"><details class="transfer-details"><summary>Exact values for this view</summary><div class="transfer-table-scroll" tabindex="0" role="region" aria-label="Demonstration scale success rates"><table class="transfer-table"><caption class="sr-only">Success rate in percent by demonstrations per task, for both policies.</caption><thead></thead><tbody></tbody></table></div></details><a class="text-link" href="./media/results/data-scale.csv" download>Download curve data <span aria-hidden="true">↓</span></a></div>
    <p class="sr-only transfer-scale-status" role="status" aria-live="polite"></p>`;

  for (const policy of policies) {
    policy.element = host.querySelector(`[data-scale-panel="${policy.model}"]`);
    policy.svg = policy.element.querySelector("svg");
    policy.tooltip = policy.element.querySelector(".transfer-scale-tooltip");
  }
  const slider = host.querySelector("#transfer-scale-budget");
  let animation;
  let curveCoordinates = null;
  const path = (coordinates) =>
    coordinates
      .map(
        ([cx, cy], index) =>
          `${index ? "L" : "M"}${cx.toFixed(2)},${cy.toFixed(2)}`,
      )
      .join(" ");
  const areaPath = (coordinates) =>
    `${path(coordinates)}L${coordinates.at(-1)[0]},305L${coordinates[0][0]},305Z`;
  function hideTooltips() {
    policies.forEach((policy) => {
      policy.tooltip.hidden = true;
    });
  }
  function showTooltip(policy, marker) {
    if (!marker) return;
    hideTooltips();
    const task = marker.dataset.scalePointTask;
    const budget = Number(marker.dataset.scalePointBudget);
    const row = pointFor(policy.model, task, budget);
    const bounds = policy.element
      .querySelector(".transfer-scale-canvas")
      .getBoundingClientRect();
    const tooltip = policy.tooltip;
    tooltip.innerHTML = `<span>${policy.label} · ${task}</span><strong>${row.success_rate.toFixed(1)}<small>% success</small></strong><span>${budget} demonstrations / task</span>`;
    tooltip.hidden = false;
    tooltip.style.left = `${Math.max(8, Math.min(bounds.width - tooltip.offsetWidth - 8, (x(budget) / chartWidth) * bounds.width - tooltip.offsetWidth / 2))}px`;
    tooltip.style.top = `${Math.max(6, (y(row.success_rate) / 370) * bounds.height - tooltip.offsetHeight - 18)}px`;
  }
  function setCurves(coordinates) {
    curveCoordinates = coordinates;
    policies.forEach((policy, modelIndex) => {
      tasks.forEach((task, taskIndex) =>
        policy.element
          .querySelector(`[data-scale-curve="${task}"]`)
          .setAttribute("d", path(coordinates[modelIndex][taskIndex])),
      );
      policy.element
        .querySelector(".transfer-chart-area")
        .setAttribute(
          "d",
          areaPath(coordinates[modelIndex][tasks.indexOf(state.task)]),
        );
    });
  }
  function animateCurves(next) {
    cancelAnimationFrame(animation);
    if (!curveCoordinates || reducedMotion.matches) {
      setCurves(next);
      return;
    }
    const previous = curveCoordinates.map((model) =>
      model.map((series) => series.map((point) => [...point])),
    );
    const started = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - started) / 360);
      const eased = 1 - (1 - progress) ** 3;
      setCurves(
        next.map((model, modelIndex) =>
          model.map((series, taskIndex) =>
            series.map(([cx, cy], point) => [
              previous[modelIndex][taskIndex][point][0] +
                (cx - previous[modelIndex][taskIndex][point][0]) * eased,
              previous[modelIndex][taskIndex][point][1] +
                (cy - previous[modelIndex][taskIndex][point][1]) * eased,
            ]),
          ),
        ),
      );
      if (progress < 1) animation = requestAnimationFrame(frame);
    }
    animation = requestAnimationFrame(frame);
  }
  function updateCheckpoint(announce = true) {
    const available = budgets();
    host
      .querySelectorAll("[data-scale-task]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.scaleTask === state.task),
        ),
      );
    policies.forEach((policy, modelIndex) => {
      const panel = policy.element;
      const active = pointFor(policy.model, state.task);
      const initial = pointFor(policy.model, state.task, 10);
      const atomic = pointFor(policy.model, "Atomic");
      const compositional = pointFor(policy.model, "Compositional");
      const gain = active.success_rate - initial.success_rate;
      const gap = atomic.success_rate - compositional.success_rate;
      panel.style.setProperty(
        "--scale-main",
        policy.colors[tasks.indexOf(state.task)],
      );
      panel.querySelectorAll("[data-scale-legend-task]").forEach((label) => {
        label.textContent = `${pointFor(policy.model, label.dataset.scaleLegendTask).success_rate.toFixed(1)}%`;
      });
      tasks.forEach((task, index) => {
        const curve = panel.querySelector(`[data-scale-curve="${task}"]`);
        curve.style.setProperty("--transfer-series", policy.colors[index]);
        curve.classList.toggle("is-muted", task !== state.task);
      });
      panel.querySelectorAll("[data-scale-point-budget]").forEach((marker) => {
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
      const line = panel.querySelector(".transfer-checkpoint-line");
      line.setAttribute("x1", x(state.budget));
      line.setAttribute("x2", x(state.budget));
      panel.querySelector("[data-scale-rate-label]").textContent =
        `${state.task} success`;
      panel.querySelector("[data-scale-rate]").innerHTML =
        `${active.success_rate.toFixed(1)}<small>%</small>`;
      panel.querySelector("[data-scale-checkpoint]").textContent =
        `${state.budget} demos / task`;
      panel.querySelector("[data-scale-gain]").innerHTML =
        `${gain > 0 ? "+" : gain < 0 ? "−" : ""}${Math.abs(gain).toFixed(1)}<small> pp</small>`;
      panel.querySelector("[data-scale-baseline]").textContent =
        `${initial.success_rate.toFixed(1)}% → ${active.success_rate.toFixed(1)}%`;
      panel.querySelector("[data-scale-gap]").innerHTML =
        `${gap < 0 ? "−" : ""}${Math.abs(gap).toFixed(1)}<small> pp</small>`;
      panel.querySelector("[data-scale-comparison]").textContent =
        "Atomic − compositional";
      if (curveCoordinates)
        panel
          .querySelector(".transfer-chart-area")
          .setAttribute(
            "d",
            areaPath(curveCoordinates[modelIndex][tasks.indexOf(state.task)]),
          );
    });
    host.querySelector("#transfer-budget-output").textContent = state.budget;
    slider.max = available.length - 1;
    slider.value = available.indexOf(state.budget);
    slider.setAttribute(
      "aria-valuetext",
      `${state.budget} demonstrations per task. ${policies.map((policy) => `${policy.model}: ${pointFor(policy.model, state.task).success_rate.toFixed(1)} percent ${state.task.toLowerCase()} success`).join("; ")}.`,
    );
    host
      .querySelectorAll("[data-scale-budget]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(Number(button.dataset.scaleBudget) === state.budget),
        ),
      );
    if (announce)
      host.querySelector(".transfer-scale-status").textContent =
        `${state.controller}, ${state.budget} demonstrations per task. ${policies.map((policy) => `${policy.model}, ${state.task}: ${pointFor(policy.model, state.task).success_rate.toFixed(1)} percent success`).join(". ")}.`;
  }
  function draw() {
    hideTooltips();
    const available = budgets();
    if (!available.includes(state.budget)) state.budget = available.at(-1);
    host.dataset.scaleController = state.controller;
    host
      .querySelectorAll("[data-scale-controller]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.scaleController === state.controller),
        ),
      );
    for (const policy of policies) {
      const panel = policy.element;
      panel.querySelector("title").textContent =
        `${policy.model} with ${state.controller}: success versus demonstrations per task`;
      panel.querySelector("desc").textContent =
        "Shared success-rate axis from 0 to 100 percent. " +
        tasks
          .map(
            (task) =>
              `${task}: ${rowsFor(task, policy.model)
                .map(
                  (row) =>
                    `${row.success_rate.toFixed(1)} percent at ${row.demos_per_task} demonstrations`,
                )
                .join("; ")}.`,
          )
          .join(" ") +
        " Focus or activate a marker to inspect the shared checkpoint. Exact values for both policies are in the table below.";
      panel.querySelector(".transfer-scale-grid").innerHTML = `
        ${state.controller === "SONIC" ? `<rect x="${x(50)}" y="52" width="${x(100) - x(50)}" height="253" class="transfer-scale-extension"/><text x="${(x(50) + x(100)) / 2}" y="39" text-anchor="middle" class="transfer-chart-note">SONIC-only extension</text>` : ""}
        ${[0, 25, 50, 75, 100].map((tick) => `<line x1="54" x2="464" y1="${y(tick)}" y2="${y(tick)}" class="transfer-chart-grid"/><text x="40" y="${y(tick) + 5}" text-anchor="end" class="transfer-chart-tick">${tick}</text>`).join("")}
        <text x="54" y="27" class="transfer-chart-axis">Success rate (%)</text>
        ${available.map((budget) => `<text x="${x(budget)}" y="335" text-anchor="middle" class="transfer-chart-tick">${budget}</text>`).join("")}
        <text x="259" y="365" text-anchor="middle" class="transfer-chart-axis">Demonstrations per task</text>`;
      panel.querySelector(".transfer-scale-markers").innerHTML = tasks
        .map((task, index) =>
          rowsFor(task, policy.model)
            .map(
              (row) =>
                `<g class="transfer-chart-point" data-scale-point-task="${task}" data-scale-point-budget="${row.demos_per_task}" transform="translate(${x(row.demos_per_task)} ${y(row.success_rate)})" style="--transfer-series:${policy.colors[index]}" role="button" tabindex="0" aria-pressed="false" aria-label="${escape(policy.model)}, ${task}, ${row.demos_per_task} demonstrations: ${row.success_rate.toFixed(1)} percent success"><circle r="19" class="transfer-chart-hit"/><circle r="10" class="transfer-chart-halo"/>${index ? '<path d="M0,-5L5,0L0,5L-5,0Z" class="transfer-chart-marker is-hollow"/>' : '<circle r="5" class="transfer-chart-marker"/>'}</g>`,
            )
            .join(""),
        )
        .join("");
    }
    const coordinates = policies.map((policy) =>
      tasks.map((task) => {
        const result = rowsFor(task, policy.model).map((row) => [
          x(row.demos_per_task),
          y(row.success_rate),
        ]);
        while (result.length < 4) result.push([...result.at(-1)]);
        return result;
      }),
    );
    animateCurves(coordinates);
    host.querySelector("#transfer-scale-context").textContent =
      state.controller === "Controller mean"
        ? "Five controllers, weighted equally · both policies"
        : `${state.controller} execution · both policies`;
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
  host.querySelectorAll("[data-scale-controller]").forEach((button) =>
    button.addEventListener("click", () => {
      state.controller = button.dataset.scaleController;
      draw();
    }),
  );
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
  for (const policy of policies) {
    let pointerInside = false;
    const svg = policy.svg;
    function chooseMarker(marker) {
      state.task = marker.dataset.scalePointTask;
      state.budget = Number(marker.dataset.scalePointBudget);
      updateCheckpoint();
      showTooltip(policy, marker);
    }
    svg.addEventListener("click", (event) => {
      const marker = event.target.closest("[data-scale-point-budget]");
      if (marker) chooseMarker(marker);
    });
    svg.addEventListener("pointerover", (event) => {
      const marker = event.target.closest("[data-scale-point-budget]");
      if (marker) {
        pointerInside = true;
        showTooltip(policy, marker);
      }
    });
    svg.addEventListener("pointerout", (event) => {
      if (event.target.closest("[data-scale-point-budget]")) {
        pointerInside = false;
        if (!svg.contains(document.activeElement)) policy.tooltip.hidden = true;
      }
    });
    svg.addEventListener("focusin", (event) =>
      showTooltip(policy, event.target.closest("[data-scale-point-budget]")),
    );
    svg.addEventListener("focusout", () => {
      if (!pointerInside) policy.tooltip.hidden = true;
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
        const next = policy.element.querySelector(
          `[data-scale-point-task="${marker.dataset.scalePointTask}"][data-scale-point-budget="${available[index]}"]`,
        );
        next.focus();
        chooseMarker(next);
      }
      if (event.key === "Escape") policy.tooltip.hidden = true;
    });
  }
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      cancelAnimationFrame(animation);
      curveCoordinates = null;
      draw();
    }
  });
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
  async function startComparison() {
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
  }
  playButton.addEventListener("click", startComparison);
  video.addEventListener("media-autoplay", startComparison);
  video.addEventListener("error", () => {
    if (!video.hasAttribute("src")) return;
    publishPlayback(false);
    playButton.hidden = false;
    status.textContent =
      "This clip could not load. Select Play comparison to retry.";
  });
  // Source selection stays here; shared media controls own automatic starts.
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) pause();
    });
    observer.observe(video);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });
  renderCase();
}

/** Enhance either supplied host; safe to call once or after deferred insertion. */
export function enhanceTransferStudies() {
  enhanceDataScale(document.getElementById("data-scaling-study"));
  enhanceOpenSpace(document.getElementById("open-space-study"));
}
