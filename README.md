# LocoManiLab website

The public project website is hosted at https://locomanilab.github.io/ using GitHub Pages.

Changes pushed to `main` are built and deployed by the GitHub Pages workflow. The build bundles and minifies public CSS and JavaScript with the pinned esbuild dependency:

```sh
npm ci --include=dev
node scripts/build.mjs --main-site
```

The `dist/` directory contains the deployable website, including generated demonstrations, recorded previews, and interactive room models. The policy rollout library is enabled only when its complete public hosting proof matches the approved original catalog and media hashes. Its original videos stream from an exact Git commit on GitHub until every GitHub Release is verified, while this Pages site serves the posters. Both hosting proofs preserve the original 7,607-clip selection and file hashes. A complete verified Release proof takes precedence when it arrives. Each policy's Release tag remains fixed under the uploader's no-overwrite rule; GitHub owners can still edit a normal Release.

The approved activation request binds the catalog SHA and 7,607 clips. Public original asset hashes and posters are staged under `hosting/migration/`, outside `dist/`. The one-shot activation workflow waits in thirteen bounded three-hour windows (up to 39 hours) and deploys only after the complete public proof matches the staged original assets. Ordinary Pages builds recheck the same public proof.

Third-party library attribution is retained alongside the vendored website assets.
