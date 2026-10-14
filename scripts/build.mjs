import {
  cp,
  lstat,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { policyRolloutsPendingMarkup } from "../src/policy-rollouts.js";

// The source is already a static site. An explicit allow-list keeps private
// source-provenance records, development tooling, and tests out of the release.
const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const mainSite = process.argv.includes("--main-site");
const verifyOnly = process.argv.includes("--verify-rollout-hosting");
const sourcePath = (flag, relative) => {
  const index = process.argv.indexOf(flag);
  if (index < 0) return path.join(root, relative);
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`Missing path for ${flag}`);
  return path.resolve(root, value);
};
const hostingManifestPath = sourcePath(
  "--hosting-manifest",
  "hosting/policy-rollouts-releases.json",
);
const rolloutCatalogPath = sourcePath(
  "--rollout-catalog",
  "media/results/policy-rollouts-catalog.json",
);
const posterSource = sourcePath("--poster-source", "rollout-posters");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function verifiedRolloutHosting() {
  let manifestBytes;
  try {
    manifestBytes = await readFile(hostingManifestPath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  const verify = (condition, reason) => {
    if (!condition)
      throw new Error(`Invalid policy rollout hosting manifest: ${reason}`);
  };
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes);
  } catch (cause) {
    throw new Error("Invalid policy rollout hosting manifest: invalid JSON", {
      cause,
    });
  }
  verify(
    manifest && typeof manifest === "object" && !Array.isArray(manifest),
    "expected an object",
  );
  verify(manifest.version === 1, "unsupported version");
  verify(manifest.provider === "github-releases", "unsupported provider");
  verify(
    manifest.repository === "LocoManiLab/policy-rollouts",
    "unexpected repository",
  );
  verify(manifest.complete === true, "upload is not complete");
  verify(
    manifest.verification?.playback === true &&
      manifest.verification?.seek === true &&
      typeof manifest.verification?.verifiedAt === "string" &&
      Number.isFinite(Date.parse(manifest.verification.verifiedAt)),
    "playback and seek verification is missing",
  );

  const catalogBytes = await readFile(rolloutCatalogPath);
  verify(
    manifest.catalogSha256 === sha256(catalogBytes),
    "catalog has changed since verification",
  );
  const catalog = JSON.parse(catalogBytes);
  const policies = new Map(
    catalog.policies.map((policy) => [policy.id, policy]),
  );
  const clips = new Map();
  const policyClipCounts = new Map();
  for (const group of catalog.groups) {
    verify(policies.has(group.policy), "catalog references an unknown policy");
    for (const clip of group.clips) {
      verify(
        /^[a-f0-9]{20}$/.test(clip.id) && !clips.has(clip.id),
        "catalog contains an invalid or duplicate clip ID",
      );
      clips.set(clip.id, { clip, policy: group.policy });
      policyClipCounts.set(
        group.policy,
        (policyClipCounts.get(group.policy) || 0) + 1,
      );
    }
  }
  verify(
    clips.size > 0 &&
      catalog.stats.clips === clips.size &&
      catalog.stats.policies === policies.size,
    "catalog counts do not match its contents",
  );
  verify(
    Array.isArray(manifest.policies) &&
      manifest.policies.length === policies.size,
    "release policies do not cover the catalog",
  );
  const bases = new Map();
  const tags = new Set();
  for (const release of manifest.policies) {
    verify(
      policies.has(release.id) && !bases.has(release.id),
      "unknown or duplicate release policy",
    );
    verify(
      release.versioned === true &&
        typeof release.tag === "string" &&
        /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(release.tag) &&
        !["latest", "main", "master", "nightly"].includes(release.tag) &&
        !tags.has(release.tag),
      "each policy needs a distinct fixed version tag",
    );
    verify(
      policyClipCounts.get(release.id) <= 1000,
      "a policy exceeds the GitHub Release asset limit",
    );
    tags.add(release.tag);
    bases.set(
      release.id,
      `https://github.com/${manifest.repository}/releases/download/${encodeURIComponent(release.tag)}/`,
    );
  }
  verify(
    Array.isArray(manifest.entries) && manifest.entries.length === clips.size,
    "verified video entries do not cover the catalog",
  );
  const posterDirectory = await lstat(posterSource);
  verify(
    posterDirectory.isDirectory() && !posterDirectory.isSymbolicLink(),
    "poster source must be a regular directory",
  );
  const seen = new Set();
  const posterFiles = new Set();
  for (const entry of manifest.entries) {
    const source = clips.get(entry.id);
    verify(source && !seen.has(entry.id), "unknown or duplicate hosted clip");
    verify(entry.policy === source.policy, "hosted clip has the wrong policy");
    verify(
      entry.video?.name === `${entry.id}.mp4` &&
        entry.video.remoteVerified === true &&
        Number.isSafeInteger(entry.video.bytes) &&
        entry.video.bytes > 0 &&
        entry.video.bytes < 2 * 1024 ** 3 &&
        entry.video.bytes === source.clip.bytes &&
        /^[a-f0-9]{64}$/.test(entry.video.sha256),
      `remote video verification is invalid for ${entry.id}`,
    );
    verify(
      entry.poster?.path === `rollout-posters/${entry.id}.jpg` &&
        Number.isSafeInteger(entry.poster.bytes) &&
        entry.poster.bytes > 0 &&
        /^[a-f0-9]{64}$/.test(entry.poster.sha256),
      `poster verification is invalid for ${entry.id}`,
    );
    const poster = path.join(posterSource, `${entry.id}.jpg`);
    const info = await lstat(poster);
    verify(
      info.isFile() &&
        !info.isSymbolicLink() &&
        info.size === entry.poster.bytes &&
        sha256(await readFile(poster)) === entry.poster.sha256,
      `poster is missing or changed for ${entry.id}`,
    );
    seen.add(entry.id);
    posterFiles.add(poster);
  }
  return {
    catalog: {
      ...catalog,
      policies: catalog.policies.map((policy) => ({
        ...policy,
        videoBase: bases.get(policy.id),
      })),
    },
    posterFiles,
  };
}

// A missing manifest retains the pending release. An invalid present manifest
// fails before replacing dist; only complete verified uploads enable the UI.
const hostedRollouts =
  mainSite || verifyOnly ? await verifiedRolloutHosting() : null;
if (verifyOnly) {
  if (!hostedRollouts)
    throw new Error("Policy rollout hosting manifest is missing");
  console.log("Complete policy rollout hosting proof and posters verified.");
  process.exit(0);
}
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
if (hostedRollouts) {
  const destination = path.join(dist, "leaderboard.html");
  const html = await readFile(destination, "utf8");
  const opening = /<section\b[^>]*\bid="policy-rollouts"[^>]*>/;
  if (!opening.test(html)) throw new Error("Policy rollout section is missing");
  await writeFile(
    destination,
    html.replace(opening, (tag) =>
      tag.replace(/\sdata-availability=(["'])pending\1/, ""),
    ),
  );
  await writeFile(
    path.join(dist, "media", "results", "policy-rollouts-catalog.json"),
    `${JSON.stringify(hostedRollouts.catalog)}\n`,
  );
  await cp(posterSource, path.join(dist, "rollout-posters"), {
    recursive: true,
    filter: (source) =>
      source === posterSource || hostedRollouts.posterFiles.has(source),
  });
} else if (mainSite) {
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
    ? hostedRollouts
      ? "Main site built in dist/ — verified policy rollouts stream from GitHub Releases."
      : "Main site built in dist/ — policy rollout library pending separate release."
    : "Static site built in dist/ — no browser-side package dependencies.",
);
