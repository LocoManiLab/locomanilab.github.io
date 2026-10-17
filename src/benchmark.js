import { resultTables } from "./results-data.js?v=20261017-results";
import { enhanceControllerRadar } from "./controller-radar.js?v=20261017-home-studies";
import { policyProfiles, policyLogo } from "./stack-data.js?v=20261017-results";

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

const policies = new Map(policyProfiles.map((policy) => [policy.name, policy]));
const rolloutPolicyIds = new Map([
  ["DM0.5", "dm05"],
  ["StarVLA-α", "starvla"],
  ["PRTS", "prts"],
  ["π₀.₅", "pi05"],
  ["GR00T N1.7", "gr00t"],
  ["XR-1", "xr1"],
  ["InternVLA-A1.5", "internvla_a15"],
  ["Ψ₀", "psi0"],
  ["X-VLA", "xvla"],
  ["SmolVLA", "smolvla"],
  ["Diffusion Policy", "dp_robocasa"],
  ["Fast-WAM", "fastwam"],
  ["DreamZero", "dreamzero"],
]);

function policyIdentity(name, group = false) {
  const policy = policies.get(name === "GR00T" ? "GR00T N1.7" : name);
  if (!policy) return escape(name);
  const content = `<span class="table-policy-brand">${policyLogo(policy)}</span><span class="table-policy-name">${escape(name)}</span>`;
  return group
    ? `<span class="table-policy-group">${content}</span>`
    : `<a class="table-policy-link" href="${escape(policy.url)}" target="_blank" rel="noopener">${content}</a>`;
}

function policyRollouts(name) {
  const id = rolloutPolicyIds.get(name);
  if (
    id &&
    document.querySelector("#policy-rollouts")?.dataset.availability ===
      "pending"
  )
    return `<a class="table-rollout-link" href="#policy-rollouts" aria-label="${escape(name)} rollout release information">Release info <span aria-hidden="true">↗</span></a>`;
  return id
    ? `<a class="table-rollout-link" href="#policy-rollouts" data-rollout-policy="${escape(id)}" aria-label="View ${escape(name)} rollouts">Rollouts <span aria-hidden="true">↗</span></a>`
    : "";
}

function renderTable(host, key) {
  const data = resultTables[key];
  const columns = data.groups.flatMap((group) =>
    group.labels.map((label, i) => ({
      label,
      group: group.name,
      count: group.counts[i],
      start: i === 0,
    })),
  );
  const best = columns.map((_, i) =>
    [...new Set(data.rows.map(([, values]) => values[i]))].sort(
      (a, b) => b - a,
    ),
  );
  let sortColumn = key === "sources" ? 2 : columns.length - 1;
  let direction = -1;
  host.innerHTML = `
    <div class="result-table-header">
      <div><p class="result-context">${escape(data.caption)}</p><p class="result-scope">${escape(data.scope)}</p></div>
      <div class="result-downloads"><a class="result-source" href="${data.source}" download>Summary data <span aria-hidden="true">↓</span></a>${data.perTaskSource ? `<a class="result-source" href="${data.perTaskSource}" download>Per-task data <span aria-hidden="true">↓</span></a>` : ""}</div>
    </div>
    <div class="table-scroll" role="region" aria-label="${escape(data.title)} table, scroll horizontally for all columns" tabindex="0">
      <table class="benchmark-table${key === "sources" ? "" : " policy-ranking-table"}">
        <caption class="sr-only">${escape(data.title)}. ${escape(data.caption)}. ${escape(data.scope)}.</caption>
        <thead><tr class="table-groups"><th scope="col" rowspan="2">${data.rowLabel}</th>${data.groups.map((group) => `<th scope="colgroup" class="${group.name === "Overall" ? "overall-cell" : ""}" colspan="${group.labels.length}">${key === "sources" ? policyIdentity(group.name, true) : escape(group.name)}</th>`).join("")}</tr>
        <tr>${columns.map((column, i) => `<th scope="col" class="${column.start ? "group-start " : ""}${column.group === "Overall" ? "overall-cell" : ""}" aria-sort="none"><button type="button" data-sort="${i}" aria-label="Sort by ${escape(column.group)} ${escape(column.label)}">${escape(column.label)}<span class="sort-arrow" aria-hidden="true">↕</span><small>${column.count} tasks</small></button></th>`).join("")}</tr></thead>
        <tbody></tbody>
      </table>
    </div>
    <div class="result-table-footer"><p><strong>Bold</strong> = best${data.bestOnly ? "" : "; <u>underlined</u> = second best"} in each column. Click a column to sort.</p><span class="table-scroll-hint">Scroll to see all columns →</span></div>
    <p class="sr-only table-sort-status" role="status" aria-live="polite"></p>`;
  const update = (announce = false) => {
    const rows = data.rows
      .map((row, original) => ({ row, original }))
      .sort(
        (a, b) =>
          direction * (a.row[1][sortColumn] - b.row[1][sortColumn]) ||
          a.original - b.original,
      );
    host.querySelector("tbody").innerHTML = rows
      .map(
        ({ row: [name, values] }, rank) => `
      <tr><th scope="row"><span class="table-policy"><span class="table-rank" aria-hidden="true">${String(rank + 1).padStart(2, "0")}</span>${key === "sources" ? escape(name) : policyIdentity(name)}</span>${key === "sources" ? "" : policyRollouts(name)}</th>${values
        .map((value, i) => {
          const status =
            value === best[i][0]
              ? "best"
              : !data.bestOnly && value === best[i][1]
                ? "second"
                : "";
          const number = value.toFixed(1);
          return `<td class="${columns[i].start ? "group-start " : ""}${i === sortColumn ? "sorted-column " : ""}${columns[i].group === "Overall" ? "overall-cell" : ""}"><span class="result-value ${status}">${number}</span></td>`;
        })
        .join("")}</tr>`,
      )
      .join("");
    host.querySelectorAll("[data-sort]").forEach((button) => {
      const active = Number(button.dataset.sort) === sortColumn;
      button
        .closest("th")
        .setAttribute(
          "aria-sort",
          active ? (direction === -1 ? "descending" : "ascending") : "none",
        );
      button.querySelector(".sort-arrow").textContent = active
        ? direction === -1
          ? "↓"
          : "↑"
        : "↕";
    });
    if (announce)
      host.querySelector(".table-sort-status").textContent =
        `Sorted by ${columns[sortColumn].group}, ${columns[sortColumn].label}, ${direction === -1 ? "highest first" : "lowest first"}.`;
  };
  host.addEventListener("click", (event) => {
    const rolloutLink = event.target.closest("[data-rollout-policy]");
    if (rolloutLink) {
      if (
        !event.defaultPrevented &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !event.altKey
      )
        document.dispatchEvent(
          new CustomEvent("policy-rollout-select", {
            detail: { policy: rolloutLink.dataset.rolloutPolicy },
          }),
        );
      return;
    }
    const button = event.target.closest("[data-sort]");
    if (!button) return;
    const next = Number(button.dataset.sort);
    direction = next === sortColumn ? -direction : -1;
    sortColumn = next;
    update(true);
  });
  update();
}

export function enhanceResultTables(root = document) {
  root
    .querySelectorAll("[data-result-table]")
    .forEach((host) => renderTable(host, host.dataset.resultTable));
}

export function enhanceBenchmark() {
  enhanceControllerRadar();
  enhanceResultTables();
  const root = document.getElementById("benchmark-results");
  if (!root) return;
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const select = (tab, focus = false) => {
    tabs.forEach((button) => {
      const active = button === tab;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      document.getElementById(button.getAttribute("aria-controls")).hidden =
        !active;
    });
    if (focus) tab.focus({ preventScroll: true });
    const track = tab.parentElement;
    const left =
      tab.getBoundingClientRect().left -
      track.getBoundingClientRect().left +
      track.scrollLeft;
    track.scrollTo({
      left: Math.max(0, left - (track.clientWidth - tab.clientWidth) / 2),
      behavior: "instant",
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      const next =
        event.key === "ArrowRight"
          ? (i + 1) % tabs.length
          : event.key === "ArrowLeft"
            ? (i - 1 + tabs.length) % tabs.length
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? tabs.length - 1
                : null;
      if (next === null) return;
      event.preventDefault();
      select(tabs[next], true);
    });
  });
  const reveal = (hash) => {
    let id;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    const target = document.getElementById(id);
    const panel = target?.closest('[role="tabpanel"]');
    if (!panel || !root.contains(panel)) return;
    const tab = tabs.find(
      (button) => button.getAttribute("aria-controls") === panel.id,
    );
    if (tab) select(tab);
  };
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link) reveal(link.hash);
  });
  window.addEventListener("hashchange", () => reveal(location.hash));
  reveal(location.hash);
}
