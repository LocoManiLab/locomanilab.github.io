import { enhanceMediaControls } from "./media-controls.js?v=20261017-autoplay";
const homeStudies = new Map([
  ["#benchmark-sources", "#data-source-study"],
  ["#benchmark-scaling", "#benchmark-scaling"],
  ["#data-scaling-study", "#data-scaling-study"],
  ["#open-space-study", "#open-space-study"],
]);
function redirectStudyBookmark() {
  if (homeStudies.has(location.hash))
    location.replace(
      new URL(
        `./index.html${homeStudies.get(location.hash)}`,
        document.baseURI,
      ),
    );
}
redirectStudyBookmark();
window.addEventListener("hashchange", redirectStudyBookmark);

import { enhanceNavigation } from "./navigation.js?v=20261013-pages";
import { enhanceBenchmark } from "./benchmark.js?v=20261017-home-studies";
import { enhancePolicyRollouts } from "./policy-rollouts.js?v=20261017-autoplay";
import { enhanceDisclosures, enhanceReading } from "./experience.js";

enhanceNavigation();
enhancePolicyRollouts();
enhanceBenchmark();
enhanceDisclosures();
enhanceReading();

enhanceMediaControls();
