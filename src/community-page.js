import { enhanceMediaControls } from "./media-controls.js?v=20261017-autoplay";
import { enhanceNavigation } from "./navigation.js?v=20261013-pages";
import { enhanceDisclosures, enhanceReading } from "./experience.js";
import "./community.js?v=20261013-simulation";

enhanceNavigation();
enhanceDisclosures();
enhanceReading();

enhanceMediaControls();
