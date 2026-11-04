// Four execution stages share one content area. Keep descendant anchors usable
// from navigation, bookmarked URLs, and browser history, even in hidden panes.
export function enhanceExecutionStack(selectController) {
  const host = document.querySelector("#execution-stack");
  const tabs = [...host.querySelectorAll(".stack-tab")];
  const panels = [...host.querySelectorAll(":scope > .stack-panel")];
  const select = (id, preserveScroll = false) => {
    const scrollBefore = window.scrollY;
    for (const tab of tabs) {
      const active = tab.getAttribute("aria-controls") === id;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    }
    for (const panel of panels) panel.hidden = panel.id !== id;
    host.dispatchEvent(new CustomEvent("stackchange", { bubbles: true }));
    // Stop a still-running anchor animation when the user selects a stage.
    if (preserveScroll)
      window.scrollTo({ top: scrollBefore, behavior: "instant" });
  };
  host.querySelector("#stack-tabs").addEventListener("click", (event) => {
    const tab = event.target.closest(".stack-tab");
    if (tab) select(tab.getAttribute("aria-controls"), true);
  });
  host.querySelector("#stack-tabs").addEventListener("keydown", (event) => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    select(tabs[next].getAttribute("aria-controls"), true);
    tabs[next].focus({ preventScroll: true });
  });
  const reveal = (hash) => {
    let id;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    const target = document.getElementById(id);
    const panel = target?.closest(".stack-panel");
    if (!panel) return;
    select(panel.id);
    if (target.matches(".controller-tab")) selectController(target.dataset.id);
    return target;
  };
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link) reveal(link.hash);
  });
  window.addEventListener("hashchange", () => reveal(location.hash));
  reveal(location.hash);
}
