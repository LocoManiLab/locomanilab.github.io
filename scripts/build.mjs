import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { policyRolloutsPendingMarkup } from "../src/policy-rollouts.js";

// The source is already a static site. An explicit allow-list keeps private
// source-provenance records, development tooling, and tests out of the release.
const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const mainSite = process.argv.includes("--main-site");
const mainSiteSourceOnly = new Set([
  path.join(root, "media", "embodiment", "g1-dex3-dataset.webp"),
  path.join(root, "media", "results", "policy-rollouts-catalog.json"),
  path.join(root, "media", "overview", "task-scenes.webp"),
  path.join(root, "media", "overview", "randomized-task.webp"),
]);
const entries = [
  "index.html",
  "leaderboard.html",
  "community.html",
  "src",
  "brand/locomanilab-logo.png",
  "brand/arxiv.svg",
  "brand/github.svg",
  "brand/github-LICENSE.txt",
  "fonts",
  "media",
  "paper",
];
for (const entry of entries) await stat(path.join(root, entry));
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const entry of entries)
  await cp(path.join(root, entry), path.join(dist, entry), {
    recursive: true,
    filter: (source) => {
      if (source === path.join(root, "media", "overview", "PROMPTS.md"))
        return false;
      if (!mainSite) return true;
      // The browser uses 3D rooms and paired DR comparisons. Legacy room
      // videos, old illustrations, and individual DR cameras stay in source.
      return (
        !mainSiteSourceOnly.has(source) &&
        !(
          path.dirname(source) === path.join(root, "media", "dr") &&
          /-(thirdperson|ego)\.(mp4|jpg)$/.test(source)
        ) &&
        !(
          path.dirname(source) === path.join(root, "media", "rooms") &&
          source.endsWith(".mp4")
        )
      );
    },
  });
if (mainSite) {
  const destination = path.join(dist, "leaderboard.html");
  const html = await readFile(destination, "utf8");
  const section =
    /(<section\b[^>]*\bid="policy-rollouts"[^>]*>)[\s\S]*?<\/section>/;
  if (!section.test(html)) throw new Error("Policy rollout section is missing");
  await writeFile(
    destination,
    html.replace(
      section,
      (_, opening) =>
        `${opening.replace(/>$/, ' data-availability="pending">')}\n` +
        `<div id="policy-rollouts-root">${policyRolloutsPendingMarkup}</div>\n</section>`,
    ),
  );
}
console.log(
  mainSite
    ? "Main site built in dist/ — policy rollout library pending separate release."
    : "Static site built in dist/ — no browser-side package dependencies.",
);
