import { controllerMeasurements } from "./controller-metrics.js?v=20261009-radar";
import {
  controllerProfiles,
  organizationLogos,
} from "./stack-data.js?v=20261009-identity";

const controllers = [
  { id: "sonic", name: "SONIC", color: "#315ee7", dash: "" },
  { id: "amo", name: "AMO", color: "#ad5012", dash: "9 3" },
  { id: "heft", name: "HEFT", color: "#007484", dash: "3 3" },
  { id: "almi", name: "ALMI", color: "#8051b0", dash: "10 3 2 3" },
  { id: "scalebfm", name: "ScaleBFM", color: "#b64364", dash: "6 3" },
];

export const radarMetrics = [
  {
    key: "success",
    label: "Success rate",
    short: "Success",
    unit: "%",
    decimals: 1,
    direction: "↑",
    description:
      "Completed episodes as a percentage of all evaluation episodes.",
  },
  {
    key: "power",
    label: "Output power",
    short: "Power",
    unit: "W",
    decimals: 0,
    direction: "↓",
    reference: 50,
    successOnly: true,
    description:
      "Mean mechanical output power across all 43 motors, over successful episodes.",
  },
  {
    key: "slip",
    label: "Foot slip",
    short: "Foot slip",
    unit: "cm/s",
    decimals: 1,
    direction: "↓",
    reference: 2,
    description: "Horizontal foot speed while in contact, over all episodes.",
  },
  {
    key: "actionRate",
    label: "Action rate",
    short: "Action rate",
    unit: "rad/s",
    decimals: 1,
    direction: "↓",
    reference: 10,
    description:
      "Change in the 29 body-joint position targets per second, over all episodes.",
  },
  {
    key: "fall",
    label: "Fall rate",
    short: "Falls",
    unit: "%",
    decimals: 1,
    direction: "↓",
    description:
      "Episodes with a pelvis drop greater than 0.3 m, as a percentage of all episodes.",
  },
  {
    key: "relativeTime",
    label: "Relative time",
    short: "Rel. time",
    unit: "×",
    decimals: 2,
    direction: "↓",
    reference: 1,
    successOnly: true,
    description:
      "Time to success relative to the same task’s median across controllers of the same model.",
  },
];

const tableMetrics = [
  radarMetrics[0],
  radarMetrics[1],
  {
    key: "energy",
    label: "Output energy",
    unit: "kJ",
    decimals: 2,
    successOnly: true,
  },
  {
    key: "legShare",
    label: "Leg share",
    unit: "%",
    decimals: 0,
    successOnly: true,
  },
  radarMetrics[2],
  radarMetrics[3],
  radarMetrics[4],
  {
    key: "time",
    label: "Time to success",
    unit: "s",
    decimals: 1,
    successOnly: true,
  },
  radarMetrics[5],
];

// Display coordinates only: fixed across filters, never a reported score.
export function radarRadius(metric, value) {
  if (value === null) return null;
  if (metric.key === "success") return value / 100;
  if (metric.key === "fall") return 1 - value / 100;
  return metric.reference / (metric.reference + value);
}

function number(row, metric) {
  const value = row[metric.key];
  if (value === null) return "—";
  return `${value.toFixed(metric.decimals)}${row.flagged.includes(metric.key) ? "†" : ""}`;
}

function point(index, radius) {
  const angle = (index * Math.PI) / 3 - Math.PI / 2;
  return [
    260 + 148 * radius * Math.cos(angle),
    220 + 148 * radius * Math.sin(angle),
  ];
}

function pathFor(values) {
  const missing = values.findIndex((value) => value === null);
  const start = missing < 0 ? 0 : (missing + 1) % values.length;
  let connected = false;
  let path = "";
  for (let step = 0; step < values.length; step++) {
    const i = (start + step) % values.length;
    if (values[i] === null) {
      connected = false;
      continue;
    }
    const [x, y] = point(i, values[i]);
    path += `${connected ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)} `;
    connected = true;
  }
  return missing < 0 ? `${path}Z` : path;
}

export function enhanceControllerRadar() {
  const host = document.getElementById("controller-radar");
  if (!host) return;
  const state = {
    model: "groot",
    task: "atomic",
    scale: "50",
    metric: "success",
    hidden: new Set(),
  };
  host.innerHTML = `
    <div class="radar-controls">
      <fieldset class="radar-choice"><legend>Policy</legend><div>
        <button type="button" data-radar-model="groot" aria-pressed="true">GR00T</button>
        <button type="button" data-radar-model="pi" aria-pressed="false">π₀.₅</button>
      </div></fieldset>
      <fieldset class="radar-choice"><legend>Tasks</legend><div>
        <button type="button" data-radar-task="atomic" aria-pressed="true">Atomic</button>
        <button type="button" data-radar-task="composite" aria-pressed="false">Compositional</button>
      </div></fieldset>
      <label class="radar-scale-label" for="radar-scale">Demonstrations / task
        <select id="radar-scale"><option value="10">10 demonstrations</option><option value="30">30 demonstrations</option><option value="50" selected>50 demonstrations</option><option value="100">100 · SONIC only</option><option value="pooled">All scales pooled</option></select>
      </label>
    </div>
    <div class="radar-context"><p id="radar-scope"></p><span>Outward = better · fixed scales</span></div>
    <div class="radar-legend" role="group" aria-label="Visible controllers">
      ${controllers.map((controller) => `<button type="button" data-radar-controller="${controller.id}" style="--series-color:${controller.color}" aria-pressed="true"><span class="radar-swatch" aria-hidden="true"></span>${controller.name}</button>`).join("")}
      <button type="button" class="radar-reset">Show all</button>
    </div>
    <div class="radar-comparison">
      <figure class="radar-plot"><div class="radar-canvas"><svg viewBox="0 0 520 425" role="img" aria-labelledby="radar-title radar-description"></svg><div class="radar-tooltip" hidden></div><p class="radar-empty" hidden>Select a controller above to compare.</p></div>
        <figcaption>Point to an axis or a marker to inspect its value.<br><span>◇ / †: fewer than 20 successful episodes.</span></figcaption>
      </figure>
      <div class="radar-detail">
        <label for="radar-metric">Inspect a metric</label>
        <select id="radar-metric">${radarMetrics.map((metric) => `<option value="${metric.key}">${metric.label} ${metric.direction}</option>`).join("")}</select>
        <p class="radar-metric-description"></p>
        <p class="radar-population"></p>
        <div class="radar-values"></div>
      </div>
    </div>
    <p class="radar-sampling-note">Power and relative time use successful episodes; success, slip, action rate and falls use all episodes.</p>
    <details class="radar-raw"><summary>Raw measurements <span aria-hidden="true">+</span></summary>
      <div class="radar-table-scroll" role="region" aria-label="Controller measurements, scroll horizontally for all metrics" tabindex="0"><table class="radar-data-table"><caption class="sr-only">Reported controller measurements for the current policy, task type and data scale.</caption><thead><tr><th scope="col">Controller</th>${tableMetrics.map((metric) => `<th scope="col">${metric.label}<small>${metric.unit}</small></th>`).join("")}<th scope="col">Successful<small>episodes</small></th></tr></thead><tbody></tbody></table></div>
    </details>
    <details class="radar-method"><summary>How to read this chart <span aria-hidden="true">+</span></summary>
      <div><p>The chart compares controllers within one policy, task type and data setting. Values in the metric panel and table are the reported measurements, not normalized scores.</p>
      <p>Success uses SR / 100; falls use 1 − fall / 100. The other axes use reference / (reference + value): 50 W for power, 2 cm/s for slip, 10 rad/s for action rate and 1× for relative time. These fixed display scales are shared by every selection. The chart does not compute an overall ranking.</p>
      <p>A diamond / dagger marks a success-only measurement with fewer than 20 successes. No success means a missing value and a gap in the line. At 100 demonstrations, only SONIC has data. Pooled rows are the supplied Table 2 aggregates: 400 episodes for SONIC and 300 for each other controller, not averages of the displayed checkpoint rows.</p>
      <p>Output power counts positive and negative mechanical work across 43 motors, without electrical losses. Two π₀.₅ / ALMI numerical divergences are counted in success and fall rates, but excluded from slip and action rate. Successful-only metrics can reflect different solved task mixes across controllers.</p></div>
    </details>
    <p class="sr-only radar-status" role="status" aria-live="polite"></p>`;

  const svg = host.querySelector("svg");
  const metricSelect = host.querySelector("#radar-metric");
  const tooltip = host.querySelector(".radar-tooltip");
  const legend = [...host.querySelectorAll("[data-radar-controller]")];
  let rows = [];
  let visible = [];
  let highlighted = null;

  function highlight(id) {
    highlighted = id;
    svg.querySelectorAll(".radar-series").forEach((series) => {
      series.classList.toggle(
        "is-muted",
        Boolean(id && series.dataset.controller !== id),
      );
      series.classList.toggle(
        "is-highlighted",
        series.dataset.controller === id,
      );
    });
    host
      .querySelectorAll(".radar-value-row")
      .forEach((row) =>
        row.classList.toggle("is-highlighted", row.dataset.controller === id),
      );
  }

  function inspect(key) {
    state.metric = key;
    metricSelect.value = key;
    const metric = radarMetrics.find((item) => item.key === key);
    host.querySelector(".radar-metric-description").textContent =
      metric.description;
    host.querySelector(".radar-population").textContent = metric.successOnly
      ? "Successful episodes only"
      : "All evaluation episodes";
    host.querySelector(".radar-values").innerHTML = visible
      .map((controller) => {
        const row = rows.find((item) => item.controller === controller.name);
        const profile = controllerProfiles[controller.id];
        return `<button type="button" class="radar-value-row" data-controller="${controller.id}" style="--series-color:${controller.color}" aria-label="${controller.name}, ${metric.label}: ${row[metric.key] === null ? "no successful episodes" : `${number(row, metric)} ${metric.unit}`}"><span class="radar-controller-identity">${organizationLogos(profile.organizations.slice(0, 1))}<span>${controller.name}<small>${row.nSuccess} / ${row.episodes} successful</small></span></span><span class="radar-raw-value">${number(row, metric)}<small>${row[metric.key] === null ? "no success" : metric.unit}</small></span></button>`;
      })
      .join("");
    svg
      .querySelectorAll("[data-metric]")
      .forEach((element) =>
        element.classList.toggle("is-selected", element.dataset.metric === key),
      );
    highlight(highlighted);
  }

  function update(announce = false) {
    rows = controllerMeasurements.filter(
      (row) =>
        row.model === state.model &&
        row.task === state.task &&
        row.scale === state.scale,
    );
    visible = controllers.filter(
      (controller) =>
        rows.some((row) => row.controller === controller.name) &&
        !state.hidden.has(controller.id),
    );
    tooltip.hidden = true;
    highlighted = null;
    host
      .querySelectorAll("[data-radar-model]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.radarModel === state.model),
        ),
      );
    host
      .querySelectorAll("[data-radar-task]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.radarTask === state.task),
        ),
      );
    legend.forEach((button) => {
      const controller = controllers.find(
        (item) => item.id === button.dataset.radarController,
      );
      button.disabled = !rows.some((row) => row.controller === controller.name);
      button.setAttribute(
        "aria-pressed",
        String(!button.disabled && !state.hidden.has(controller.id)),
      );
    });
    const policy = state.model === "groot" ? "GR00T" : "π₀.₅";
    const tasks = state.task === "atomic" ? "Atomic" : "Compositional";
    const scale =
      state.scale === "pooled"
        ? "all scales pooled · 400 episodes for SONIC, 300 for others"
        : `${state.scale} demonstrations / task · 100 episodes${state.scale === "100" ? " · SONIC only" : " / controller"}`;
    host.querySelector("#radar-scope").textContent =
      `${policy} · ${tasks} · ${scale}`;
    const grids = [0.25, 0.5, 0.75, 1]
      .map(
        (radius) =>
          `<polygon points="${radarMetrics.map((_, i) => point(i, radius).join(",")).join(" ")}" />`,
      )
      .join("");
    const axes = radarMetrics
      .map((metric, i) => {
        const [x, y] = point(i, 1);
        const [lx, ly] = point(i, 1.22);
        const anchor = i === 0 || i === 3 ? "middle" : i < 3 ? "start" : "end";
        return `<line x1="260" y1="220" x2="${x}" y2="${y}"/><g class="radar-axis" data-metric="${metric.key}"><text x="${lx}" y="${ly - 4}" text-anchor="${anchor}">${metric.short} ${metric.direction}</text><text class="radar-axis-unit" x="${lx}" y="${ly + 13}" text-anchor="${anchor}">${metric.unit}</text></g>`;
      })
      .join("");
    const series = visible
      .map((controller) => {
        const row = rows.find((item) => item.controller === controller.name);
        const values = radarMetrics.map((metric) =>
          radarRadius(metric, row[metric.key]),
        );
        const markers = radarMetrics
          .map((metric, i) => {
            if (values[i] === null) return "";
            const [x, y] = point(i, values[i]);
            const small = row.flagged.includes(metric.key);
            const shape = small
              ? `<path class="radar-marker" d="M${x},${y - 5}l5,5 -5,5 -5,-5Z"/>`
              : `<circle class="radar-marker" cx="${x}" cy="${y}" r="3.8"/>`;
            return `<g class="radar-point" data-metric="${metric.key}" data-controller="${controller.id}"><title>${controller.name} · ${metric.label}: ${number(row, metric)} ${metric.unit}${small ? `; ${row.nSuccess} successful episodes` : ""}</title><circle class="radar-hit" cx="${x}" cy="${y}" r="12"/>${shape}</g>`;
          })
          .join("");
        return `<g class="radar-series" data-controller="${controller.id}" style="--series-color:${controller.color}"><path class="radar-area" d="${pathFor(values)}" fill="${values.some((value) => value === null) ? "none" : controller.color}"/><path class="radar-line" d="${pathFor(values)}" stroke-dasharray="${controller.dash}"/>${markers}</g>`;
      })
      .join("");
    svg.innerHTML = `<title id="radar-title">Controller comparison: ${policy}, ${tasks}, ${state.scale === "pooled" ? "pooled data" : `${state.scale} demonstrations per task`}</title><desc id="radar-description">${visible.map((item) => item.name).join(", ") || "No controllers selected"}. Six axes: success, power, slip, action rate, falls and relative time. Outward is better. Exact reported values are available in the metric panel and raw measurements table.</desc><g class="radar-grid">${grids}${axes}</g>${series}`;
    host.querySelector(".radar-empty").hidden = visible.length > 0;
    host.querySelector(".radar-data-table tbody").innerHTML = rows
      .map(
        (row) =>
          `<tr><th scope="row">${row.controller}</th>${tableMetrics.map((metric) => `<td data-measurement="${metric.key}">${number(row, metric)}</td>`).join("")}<td data-measurement="nSuccess">${row.nSuccess} / ${row.episodes}</td></tr>`,
      )
      .join("");
    inspect(state.metric);
    if (announce)
      host.querySelector(".radar-status").textContent =
        `${policy}, ${tasks}, ${scale}. ${visible.length} controllers visible.`;
  }

  host.addEventListener("click", (event) => {
    const model = event.target.closest("[data-radar-model]");
    const task = event.target.closest("[data-radar-task]");
    const controller = event.target.closest("[data-radar-controller]");
    if (model) {
      state.model = model.dataset.radarModel;
      update(true);
    } else if (task) {
      state.task = task.dataset.radarTask;
      update(true);
    } else if (controller) {
      const id = controller.dataset.radarController;
      state.hidden.has(id) ? state.hidden.delete(id) : state.hidden.add(id);
      update(true);
    } else if (event.target.closest(".radar-reset")) {
      state.hidden.clear();
      update(true);
    } else if (event.target.closest("[data-metric]"))
      inspect(event.target.closest("[data-metric]").dataset.metric);
    else if (event.target.closest(".radar-value-row"))
      highlight(event.target.closest(".radar-value-row").dataset.controller);
  });
  host.querySelector("#radar-scale").addEventListener("change", (event) => {
    state.scale = event.target.value;
    update(true);
  });
  metricSelect.addEventListener("change", () => {
    tooltip.hidden = true;
    inspect(metricSelect.value);
  });
  host.addEventListener("pointerover", (event) => {
    const pointTarget = event.target.closest(".radar-point");
    const valueRow = event.target.closest(".radar-value-row");
    const axis = event.target.closest(".radar-axis");
    if (pointTarget) {
      const id = pointTarget.dataset.controller;
      const metric = radarMetrics.find(
        (item) => item.key === pointTarget.dataset.metric,
      );
      const controller = controllers.find((item) => item.id === id);
      const row = rows.find((item) => item.controller === controller.name);
      inspect(metric.key);
      highlight(id);
      tooltip.textContent = `${controller.name} · ${number(row, metric)} ${metric.unit}${row.flagged.includes(metric.key) ? ` · n = ${row.nSuccess}` : ""}`;
      tooltip.hidden = false;
      const canvas = host
        .querySelector(".radar-canvas")
        .getBoundingClientRect();
      tooltip.style.left = `${Math.min(Math.max(8, event.clientX - canvas.left + 12), Math.max(8, canvas.width - tooltip.offsetWidth - 8))}px`;
      tooltip.style.top = `${Math.max(8, event.clientY - canvas.top - tooltip.offsetHeight - 12)}px`;
    } else if (valueRow) highlight(valueRow.dataset.controller);
    else if (axis) {
      tooltip.hidden = true;
      inspect(axis.dataset.metric);
      highlight(null);
    }
  });
  host.querySelector(".radar-canvas").addEventListener("pointerleave", () => {
    tooltip.hidden = true;
    highlight(null);
  });
  host
    .querySelector(".radar-values")
    .addEventListener("pointerleave", () => highlight(null));
  host.addEventListener("focusin", (event) => {
    const row = event.target.closest(".radar-value-row");
    if (row) highlight(row.dataset.controller);
  });
  host.addEventListener("focusout", (event) => {
    if (
      event.target.closest(".radar-value-row") &&
      !event.relatedTarget?.closest(".radar-value-row")
    )
      highlight(null);
  });
  update();
}
