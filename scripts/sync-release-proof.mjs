import {
  appendFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const staging = path.join(root, "hosting/migration");
const proofURL =
  process.env.ROLLOUT_PROOF_URL ||
  "https://raw.githubusercontent.com/LocoManiLab/policy-rollouts/main/hosting/policy-rollouts-releases.json";
const required = process.argv.includes("--required");
// Production activation is the complete approved 7,607-clip collection.
// Small isolated tests explicitly override this count in their child process.
const expectedClipCount = Number(process.env.ROLLOUT_EXPECTED_CLIPS || 7607);
const argument = (flag, fallback) => {
  const index = process.argv.indexOf(flag);
  if (index < 0) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(`Invalid duration for ${flag}`);
  return value;
};
const waitMs = argument("--wait-ms", 0);
const pollMs = argument("--poll-ms", 120000);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const output = async (ready) => {
  if (process.env.GITHUB_OUTPUT)
    await appendFile(process.env.GITHUB_OUTPUT, `ready=${ready}\n`);
};

let request;
try {
  request = JSON.parse(
    await readFile(path.join(staging, "activation-request.json"), "utf8"),
  );
} catch (error) {
  if (error.code !== "ENOENT" || required || waitMs) throw error;
  await output(false);
  process.exit(0);
}
const catalogPath = path.join(staging, "source-catalog.json");
const catalogBytes = await readFile(catalogPath);
const catalog = JSON.parse(catalogBytes);
if (
  request.version !== 1 ||
  request.repository !== "LocoManiLab/policy-rollouts" ||
  request.catalogSha256 !== sha256(catalogBytes) ||
  request.clips !== catalog.stats.clips ||
  request.clips !== expectedClipCount ||
  !Number.isSafeInteger(request.clips) ||
  request.clips <= 0
)
  throw new Error(
    "Rollout activation request does not match the staged source catalog.",
  );
const sourceAssets = JSON.parse(
  await readFile(path.join(staging, "source-assets.json"), "utf8"),
);
const originalAssets = new Map(
  sourceAssets.entries.map((entry) => [entry.id, entry]),
);
if (
  sourceAssets.complete !== true ||
  sourceAssets.catalogSha256 !== request.catalogSha256 ||
  sourceAssets.entries.length !== expectedClipCount ||
  originalAssets.size !== expectedClipCount
)
  throw new Error(
    "The original public source asset manifest is incomplete or stale.",
  );

async function candidate() {
  let response;
  try {
    response = await fetch(proofURL, {
      headers: { accept: "application/json", "cache-control": "no-cache" },
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    });
  } catch (error) {
    if (waitMs) return null;
    throw new Error("Unable to check the public rollout proof.", {
      cause: error,
    });
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    if (waitMs && response.status >= 500) return null;
    throw new Error(`Public rollout proof returned HTTP ${response.status}.`);
  }
  let proof;
  try {
    proof = await response.json();
  } catch (cause) {
    throw new Error("Public rollout proof is malformed JSON.", { cause });
  }
  if (!proof || proof.complete !== true)
    throw new Error("Public rollout proof is present but not complete.");
  if (
    proof.catalogSha256 !== request.catalogSha256 ||
    proof.entries?.length !== request.clips
  )
    throw new Error(
      "Public rollout proof does not match the requested source catalog.",
    );
  for (const entry of proof.entries) {
    const original = originalAssets.get(entry.id);
    if (
      !original ||
      original.video?.path !== `rollout-media/${entry.id}.mp4` ||
      original.poster?.path !== `rollout-posters/${entry.id}.jpg` ||
      entry.video?.bytes !== original.video.bytes ||
      entry.video?.sha256 !== original.video.sha256 ||
      entry.poster?.bytes !== original.poster.bytes ||
      entry.poster?.sha256 !== original.poster.sha256
    )
      throw new Error(
        "Public rollout proof differs from the original source asset hashes.",
      );
  }

  // Validate the candidate against staged public files without changing the
  // active source or dist. This shares the production build's full verifier.
  const temporary = await mkdtemp(path.join(os.tmpdir(), "rollout-proof-"));
  try {
    const candidatePath = path.join(temporary, "candidate.json");
    await writeFile(candidatePath, JSON.stringify(proof));
    const verified = spawnSync(
      process.execPath,
      [
        "scripts/build.mjs",
        "--verify-rollout-hosting",
        "--hosting-manifest",
        candidatePath,
        "--rollout-catalog",
        catalogPath,
        "--poster-source",
        path.join(staging, "rollout-posters"),
      ],
      { cwd: root, encoding: "utf8" },
    );
    if (verified.status !== 0)
      throw new Error(
        verified.stderr?.trim() || "Rollout proof verification failed.",
      );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  return proof;
}

const deadline = Date.now() + waitMs;
let proof;
do {
  proof = await candidate();
  if (proof || !waitMs || Date.now() >= deadline) break;
  await new Promise((resolve) =>
    setTimeout(resolve, Math.min(pollMs, deadline - Date.now())),
  );
} while (Date.now() <= deadline);
if (!proof) {
  await output(false);
  if (required)
    throw new Error(
      "The complete verified rollout proof is not available yet.",
    );
  if (waitMs)
    console.log("Rollout proof is not ready within this waiting window.");
  process.exit(0);
}

// Copy only public proof fields. No source locations or uploader credentials
// from diagnostic metadata can enter the Pages source or deployment artifact.
const publicProof = {
  version: proof.version,
  provider: proof.provider,
  repository: proof.repository,
  complete: proof.complete,
  catalogSha256: proof.catalogSha256,
  verification: {
    playback: proof.verification.playback,
    seek: proof.verification.seek,
    verifiedAt: proof.verification.verifiedAt,
  },
  policies: proof.policies.map(({ id, tag, versioned }) => ({
    id,
    tag,
    versioned,
  })),
  entries: proof.entries.map(({ id, policy, video, poster }) => ({
    id,
    policy,
    video: {
      name: video.name,
      bytes: video.bytes,
      sha256: video.sha256,
      remoteVerified: video.remoteVerified,
    },
    poster: { path: poster.path, bytes: poster.bytes, sha256: poster.sha256 },
  })),
};
const expectedPosters = new Set(
  publicProof.entries.map((entry) =>
    path.join(staging, "rollout-posters", `${entry.id}.jpg`),
  ),
);
const posterDestination = path.join(root, "rollout-posters");
await rm(posterDestination, { recursive: true, force: true });
await cp(path.join(staging, "rollout-posters"), posterDestination, {
  recursive: true,
  filter: (source) =>
    source === path.join(staging, "rollout-posters") ||
    expectedPosters.has(source),
});
await mkdir(path.join(root, "media/results"), { recursive: true });
await cp(
  catalogPath,
  path.join(root, "media/results/policy-rollouts-catalog.json"),
);
await writeFile(
  path.join(root, "hosting/policy-rollouts-releases.json"),
  `${JSON.stringify(publicProof, null, 2)}\n`,
);
await output(true);
console.log(
  `Activated verified source for ${request.clips} GitHub Release rollouts.`,
);
