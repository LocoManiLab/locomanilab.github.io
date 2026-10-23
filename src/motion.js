// Keep real values in HTML. Motion enhances visible content, so missing JS,
// bookmarked sections and reduced-motion preferences never hide information.
export function enhancePageMotion() {
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  if (preference.matches || !("IntersectionObserver" in window)) return;

  const runningCounts = new Map();
  const entrances = new Set();
  const finishCount = (element, state) => {
    cancelAnimationFrame(state.frame);
    element.textContent = state.finalText;
    runningCounts.delete(element);
  };
  const countObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
        const element = entry.target;
        countObserver.unobserve(element);
        if (preference.matches) continue;
        const target = Number(element.dataset.count);
        if (!Number.isFinite(target) || target <= 0) continue;
        const decimals = element.dataset.count.split(".")[1]?.length || 0;
        const format = new Intl.NumberFormat("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
        const state = {
          finalText: element.textContent,
          frame: 0,
          start: performance.now(),
        };
        // Reserve the final numeral's width: changing digit counts must not
        // move the unit, surrounding text, or other cards during animation.
        element.style.minWidth = `${element.getBoundingClientRect().width}px`;
        runningCounts.set(element, state);
        element.textContent = format.format(0);
        const tick = (now) => {
          const progress = Math.max(0, Math.min((now - state.start) / 1150, 1));
          if (progress >= 1 || preference.matches || document.hidden) {
            finishCount(element, state);
            return;
          }
          const eased = 1 - Math.pow(1 - progress, 3);
          const factor = 10 ** decimals;
          element.textContent = format.format(
            Math.floor(target * eased * factor) / factor,
          );
          state.frame = requestAnimationFrame(tick);
        };
        state.frame = requestAnimationFrame(tick);
      }
    },
    { threshold: 0.5, rootMargin: "0px 0px -20px 0px" },
  );
  document.querySelectorAll("[data-count]").forEach((element) => {
    countObserver.observe(element);
  });

  // Animate chapter headings and compact groups, never the chapter itself:
  // section anchors, sticky navigation and table layouts keep their positions.
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target;
        revealObserver.unobserve(element);
        if (preference.matches || element.contains(document.activeElement))
          continue;
        const animation = element.animate(
          [
            { opacity: 0.86, transform: "translateY(12px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 520, easing: "cubic-bezier(.22,1,.36,1)" },
        );
        entrances.add(animation);
        animation.finished
          .catch(() => {})
          .finally(() => entrances.delete(animation));
      }
    },
    { threshold: 0, rootMargin: "0px 0px -36px 0px" },
  );
  document
    .querySelectorAll(
      ".overview-intro, .section-top, .contribution-grid, .task-design-grid, " +
        ".room-tabs, #stack-tabs, .resource-grid, .reading-grid, " +
        ".interfaces-section > .detail-block, .deployment-section > .detail-block",
    )
    .forEach((element) => {
      // Long lists remain stable while their heading introduces the section.
      revealObserver.observe(element);
    });

  const settle = () => {
    for (const [element, state] of runningCounts) finishCount(element, state);
    for (const animation of entrances) animation.cancel();
    entrances.clear();
  };
  preference.addEventListener("change", () => {
    if (!preference.matches) return;
    countObserver.disconnect();
    revealObserver.disconnect();
    settle();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) settle();
  });
}
