# LocoManiLab website

The public project website is hosted at https://locomanilab.github.io/ using GitHub Pages.

Changes pushed to `main` are built and deployed by the GitHub Pages workflow. The build uses only Node.js and requires no package installation:

```sh
node scripts/build.mjs --main-site
```

The `dist/` directory contains the deployable website, including generated demonstrations, recorded previews, and interactive room models. The full policy rollout library requires a separate release; its existing pending state is preserved.

The approved activation request binds the catalog SHA and 7,607 clips. Public original asset hashes and posters are staged under `hosting/migration/`, outside `dist/`. The one-shot activation workflow waits in seven bounded three-hour windows and deploys only after the complete public proof matches the staged original assets. Ordinary Pages builds recheck the same public proof.

Third-party library attribution is retained alongside the vendored website assets.
