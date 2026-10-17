import { enhanceNavigation } from "./navigation.js?v=20261013-pages";
import { enhanceBenchmark } from "./benchmark.js?v=20261017-results";
import { enhancePolicyRollouts } from "./policy-rollouts.js?v=20261017-dm05";
import { enhanceTransferStudies } from "./transfer-studies.js?v=20261017-results";
import { enhanceDisclosures, enhanceReading } from "./experience.js";

enhanceNavigation();
enhancePolicyRollouts();
enhanceBenchmark();
enhanceTransferStudies();
enhanceDisclosures();
enhanceReading();
