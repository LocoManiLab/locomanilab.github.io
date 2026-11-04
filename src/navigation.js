import { animateSwap } from "./experience.js";

export function enhanceNavigation() {
  const nav = document.querySelector("#main-nav");
  const toggle = document.querySelector(".menu-toggle");
  if (!nav || !toggle) return;
  const mobile = matchMedia("(max-width: 1000px)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const close = () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
  };
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
    nav.classList.toggle("is-open", open);
    if (open && !reducedMotion.matches) animateSwap(nav);
  });
  mobile.addEventListener("change", () => {
    if (mobile.matches && nav.contains(document.activeElement)) toggle.focus();
    close();
  });
  nav
    .querySelectorAll("a")
    .forEach((link) => link.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      close();
      toggle.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-header")) close();
  });
  document.addEventListener("focusin", (event) => {
    if (mobile.matches && !event.target.closest(".site-header")) close();
  });
}
