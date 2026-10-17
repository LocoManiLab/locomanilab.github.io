import { overviewArtwork } from "./overview-art.js?v=20261014-live-overview";

// Static feature copy remains readable without JS. Enhance it into a tour only
// after all controls and artwork are available.
export function enhanceOverview() {
  const host = document.querySelector("#overview-tour");
  if (!host) return;
  const tabs = [...host.querySelectorAll('[role="tab"]')];
  const panels = [...host.querySelectorAll(".overview-panel")];
  const play = host.querySelector(".overview-play");
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const duration = 7000;
  let active = 0;
  let timer;
  let visible = false;
  let paused = preference.matches || navigator.connection?.saveData === true;
  let mediaPaused = paused;
  let globallyPaused = document.readyState !== "complete";

  panels.forEach((panel) => {
    panel.querySelector(".overview-art").innerHTML =
      overviewArtwork[panel.dataset.feature];
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute(
      "aria-labelledby",
      "overview-tab-" + panel.dataset.feature,
    );
    panel.tabIndex = 0;
  });
  host.style.setProperty("--tour-duration", duration + "ms");
  host.classList.add("is-enhanced");
  host.querySelector(".overview-tour-toolbar").hidden = false;
  host.querySelector(".overview-steps").hidden = false;
  const videos = [...host.querySelectorAll("[data-tour-src]")];
  const sourceButtons = [...host.querySelectorAll("[data-tour-source]")];
  const sourcePanels = [...host.querySelectorAll("[data-tour-source-panel]")];

  sourceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const source = button.dataset.tourSource;
      sourceButtons.forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)),
      );
      sourcePanels.forEach((panel) => {
        panel.hidden = panel.dataset.tourSourcePanel !== source;
        panel.inert = panel.hidden;
      });
      host.dataset.dataSource = source;
      paused = true;
      mediaPaused = false;
      sync();
    });
  });

  function syncVideos(running) {
    for (const video of videos) {
      if (
        !running ||
        video.closest(".overview-panel").inert ||
        video.closest("[data-tour-source-panel]")?.hidden
      ) {
        video.pause();
        continue;
      }
      if (!video.hasAttribute("src")) video.src = video.dataset.tourSrc;
      video.muted = true;
      video.playbackRate = Number(video.dataset.tourSpeed) || 1;
      video.play().catch(() => {
        // Keep the poster visible when a browser declines automatic playback.
      });
    }
  }

  function sync() {
    clearTimeout(timer);
    const mediaRunning =
      visible &&
      !mediaPaused &&
      !globallyPaused &&
      !preference.matches &&
      !document.hidden;
    const running = mediaRunning && !paused;
    host.dataset.running = String(running);
    host.dataset.mediaRunning = String(mediaRunning);
    syncVideos(mediaRunning);
    play.disabled = preference.matches;
    const label = preference.matches
      ? "Animation off"
      : paused
        ? "Play tour"
        : "Pause tour";
    play.querySelector("[data-tour-label]").textContent = label;
    play.querySelector("[data-tour-icon]").textContent =
      paused || preference.matches ? "▷" : "Ⅱ";
    play.setAttribute(
      "aria-label",
      preference.matches
        ? "Animation off: reduced motion"
        : paused
          ? "Play feature tour"
          : "Pause feature tour",
    );
    if (running)
      timer = setTimeout(() => {
        select((active + 1) % tabs.length);
        sync();
      }, duration);
  }

  function select(index) {
    active = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === active));
      tab.tabIndex = i === active ? 0 : -1;
      panels[i].setAttribute("aria-hidden", String(i !== active));
      panels[i].inert = i !== active;
    });
    host.dataset.activeFeature = panels[active].dataset.feature;
  }

  function selectManually(index) {
    paused = true;
    mediaPaused = false;
    select(index);
    sync();
  }

  tabs.forEach((tab, index) =>
    tab.addEventListener("click", () => selectManually(index)),
  );
  host.querySelector(".overview-steps").addEventListener("keydown", (event) => {
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
    selectManually(next);
    tabs[next].focus({ preventScroll: true });
  });
  // Hold the selected feature while reading; its media keeps playing.
  host.addEventListener("focusin", (event) => {
    if (event.target === play) return;
    paused = true;
    sync();
  });
  play.addEventListener("click", () => {
    paused = !paused;
    mediaPaused = paused;
    sync();
  });
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("preview-motion", (event) => {
    globallyPaused = event.detail.paused;
    sync();
  });
  preference.addEventListener("change", () => {
    if (preference.matches) paused = mediaPaused = true;
    sync();
  });
  const observer = new IntersectionObserver(
    (entries) => {
      visible =
        entries[0].isIntersecting && entries[0].intersectionRatio >= 0.2;
      sync();
    },
    { threshold: [0, 0.2] },
  );
  select(0);
  sync();
  observer.observe(host);
}
