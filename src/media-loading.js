// A video poster loads as soon as its attribute is assigned, even with
// preload="none". Keep deferred URLs in data-poster until the selected view
// approaches the viewport, including views revealed by tabs and disclosures.
const pending = new Set();
const preloadMargin = 300;
let observer;
let initialized = false;
let scheduled = false;

function canDisplay(video, immediate = false) {
  if (
    document.hidden ||
    !video.isConnected ||
    video.closest(
      '[hidden], [inert], [aria-hidden="true"], details:not([open])',
    )
  )
    return false;
  const rect = video.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    (immediate ||
      (rect.bottom >= -preloadMargin &&
        rect.top <= innerHeight + preloadMargin &&
        rect.right >= 0 &&
        rect.left <= innerWidth))
  );
}

function loadPoster(video, immediate = false) {
  if (!pending.has(video) || !canDisplay(video, immediate)) return;
  video.setAttribute("poster", video.dataset.poster);
  pending.delete(video);
  observer?.unobserve(video);
}

// Iterate only registered, still-deferred videos when a panel is revealed.
export function refreshMediaPosters(root = document) {
  for (const video of pending) {
    if (!video.isConnected) {
      pending.delete(video);
      observer?.unobserve(video);
    } else if (root.contains(video)) loadPoster(video);
  }
}

function initialize() {
  if (initialized) return;
  initialized = true;
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) loadPoster(entry.target);
      },
      { rootMargin: `${preloadMargin}px 0px` },
    );
  } else {
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        refreshMediaPosters();
      });
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
  }
  document.addEventListener("stackchange", () => refreshMediaPosters());
  document.addEventListener("visibilitychange", () => refreshMediaPosters());
  document.addEventListener(
    "toggle",
    (event) => {
      if (event.target.open) refreshMediaPosters(event.target);
    },
    true,
  );
}

export function setMediaPoster(video, url, { immediate = false } = {}) {
  initialize();
  const poster = url || "";
  if (video.dataset.poster !== poster) video.removeAttribute("poster");
  if (!poster) {
    delete video.dataset.poster;
    pending.delete(video);
    observer?.unobserve(video);
    return;
  }
  video.dataset.poster = poster;
  if (video.getAttribute("poster") === poster) return;
  pending.add(video);
  observer?.observe(video);
  loadPoster(video, immediate);
}

export function observeMediaPosters(root = document) {
  for (const video of root.querySelectorAll("video[data-poster]"))
    setMediaPoster(video, video.dataset.poster);
}
