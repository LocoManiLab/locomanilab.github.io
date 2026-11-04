const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

export function animateSwap(element) {
  if (reduceMotion.matches || element.getBoundingClientRect().top > innerHeight)
    return;
  element.getAnimations().forEach((animation) => animation.cancel());
  element.animate(
    [
      { opacity: 0.55, transform: "translateY(4px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    {
      duration: 200,
      easing: "cubic-bezier(.22,1,.36,1)",
    },
  );
}

// Reserve only the space needed by the longest existing text. Recalculate on
// width/font changes, never during scrolling or on every tab selection.
export function stabilizeText(element, alternatives) {
  let lastWidth = -1;
  let frame;
  const measure = () => {
    const width = element.getBoundingClientRect().width;
    if (!width || width === lastWidth) return;
    lastWidth = width;
    const probe = element.cloneNode(false);
    probe.removeAttribute("id");
    probe.setAttribute("aria-hidden", "true");
    Object.assign(probe.style, {
      position: "absolute",
      visibility: "hidden",
      pointerEvents: "none",
      minHeight: "0",
      height: "auto",
      width: `${width}px`,
    });
    element.after(probe);
    let height = 0;
    for (const text of alternatives) {
      probe.textContent = text;
      height = Math.max(height, probe.getBoundingClientRect().height);
    }
    probe.remove();
    element.style.minHeight = `${Math.ceil(height)}px`;
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(measure);
  };
  new ResizeObserver(schedule).observe(element);
  document.fonts.ready.then(() => {
    lastWidth = -1;
    schedule();
  });
  window.addEventListener(
    "resize",
    () => {
      lastWidth = -1;
      schedule();
    },
    { passive: true },
  );
  schedule();
}

export function enhanceMedia(video) {
  const feedback = document.createElement("div");
  feedback.className = "media-feedback";
  feedback.hidden = true;
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  feedback.innerHTML =
    '<span class="media-spinner" aria-hidden="true"></span><span class="media-message"></span><button type="button" hidden>Retry video</button>';
  video.parentElement.append(feedback);
  const message = feedback.querySelector(".media-message");
  const retry = feedback.querySelector("button");
  const spinner = feedback.querySelector(".media-spinner");
  let timer;
  const hide = () => {
    clearTimeout(timer);
    feedback.hidden = true;
    video.removeAttribute("aria-busy");
  };
  const loading = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (video.error || video.readyState >= 3) return;
      feedback.classList.add("is-loading");
      spinner.hidden = false;
      retry.hidden = true;
      message.textContent = "Loading video…";
      feedback.hidden = false;
      video.setAttribute("aria-busy", "true");
    }, 250);
  };
  video.addEventListener("loadstart", loading);
  video.addEventListener("waiting", loading);
  for (const event of ["loadeddata", "canplay", "playing", "emptied"])
    video.addEventListener(event, hide);
  video.addEventListener("error", () => {
    hide();
    feedback.classList.remove("is-loading");
    spinner.hidden = true;
    retry.hidden = false;
    message.textContent = "This video could not load. Please try again.";
    feedback.hidden = false;
  });
  retry.addEventListener("click", () => {
    hide();
    video.load();
    video.play().catch(() => {});
    video.focus({ preventScroll: true });
  });
}

// Reveal folded technical content before an in-page link is scrolled into view.
export function enhanceDisclosures() {
  const reveal = (hash) => {
    let id;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    const target = document.getElementById(id);
    if (!target) return;
    const study = target.closest(".experiment-study");
    if (study) study.querySelector(".experiment-disclosure").open = true;
    for (let parent = target; parent; parent = parent.parentElement) {
      if (parent.tagName === "DETAILS") parent.open = true;
    }
    // The interface and deployment anchors name their outer sections.
    if (target.matches("#interfaces, #deployment"))
      target
        .querySelector(":scope > details.detail-block")
        ?.setAttribute("open", "");
    return target;
  };
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link) reveal(link.hash);
  });
  const scrollToHash = () => {
    const target = reveal(location.hash);
    if (target)
      requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
  };
  window.addEventListener("hashchange", scrollToHash);
  scrollToHash();
}

export function enhanceReading() {
  const header = document.querySelector(".site-header");
  const topLink = document.querySelector(".reading-top");
  const links = [...document.querySelectorAll('#main-nav a[href^="#"]')];
  const groups = {
    overview: "overview",
    worlds: "worlds",
    tasks: "worlds",
    "policy-rollouts": "results",
    "task-design": "worlds",
    system: "system",
    interfaces: "system",
    dataset: "dataset",
    deployment: "results",
    results: "results",
  };
  let sections = [];
  let maxScroll = 1;
  let headerHeight = 88;
  let frame = 0;
  const render = () => {
    frame = 0;
    const y = window.scrollY;
    const progress = Math.min(1, Math.max(0, y / maxScroll));
    header.style.setProperty("--reading-progress", progress.toFixed(4));
    header.classList.toggle("is-scrolled", y > 20);
    topLink.hidden = y < innerHeight;
    let current;
    for (const section of sections) {
      if (section.top <= y + headerHeight + 65) current = groups[section.id];
      else break;
    }
    for (const link of links) {
      const active = link.hash === `#${current}`;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };
  const measure = () => {
    sections = [...document.querySelectorAll("main > section, #dataset")]
      .filter((element) => element.getClientRects().length)
      .map((element) => ({
        id: element.id,
        top: element.getBoundingClientRect().top + scrollY,
      }))
      .sort((a, b) => a.top - b.top);
    maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - innerHeight,
    );
    headerHeight = header.getBoundingClientRect().height;
    schedule();
  };
  new ResizeObserver(measure).observe(document.body);
  document.fonts.ready.then(measure);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("pageshow", measure);
  document.addEventListener("stackchange", measure);
  measure();
}
