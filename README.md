# LocoManiLab website

The public project website is hosted at https://locomanilab.github.io/ using GitHub Pages.

Changes pushed to `main` are built and deployed by the GitHub Pages workflow. The build uses only Node.js and requires no package installation:

```sh
node scripts/build.mjs --main-site
```

The `dist/` directory contains the deployable website, including generated demonstrations, recorded previews, and interactive room models. The policy rollout library is enabled only when its complete public hosting proof matches the approved original catalog and media hashes. Its original videos stream from fixed versioned GitHub Releases, while this Pages site serves the posters. Each policy's tag remains fixed under the uploader's no-overwrite rule. GitHub owners can still edit a normal Release.

The approved activation request binds the catalog SHA and 7,607 clips. Public original asset hashes and posters are staged under `hosting/migration/`, outside `dist/`. The one-shot activation workflow waits in thirteen bounded three-hour windows (up to 39 hours) and deploys only after the complete public proof matches the staged original assets. Ordinary Pages builds recheck the same public proof.

Third-party library attribution is retained alongside the vendored website assets.
