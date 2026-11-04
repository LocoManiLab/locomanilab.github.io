import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const pages = ["index.html", "leaderboard.html", "community.html"];
const attribute = (tag, name) => {
  const match = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return match ? (match[1] ?? match[2] ?? match[3]) : null;
};
const external = (url) => /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url);
const pathname = (url) => url.split(/[?#]/, 1)[0];
const relativeURL = (from, to) =>
  path.relative(from, to).split(path.sep).join("/");

function localPath(directory, url, root) {
  const target = path.resolve(
    url.startsWith("/") ? root : directory,
    decodeURIComponent(pathname(url).replace(/^\//, "")),
  );
  if (target !== root && !target.startsWith(`${root}${path.sep}`))
    throw new Error(`Build asset escapes the public directory: ${url}`);
  return target;
}

// All outputs deliberately stay one directory below the site root. Existing
// new URL("../media/...", import.meta.url) calls then retain their semantics.
export async function optimizeAssets(root) {
  const { build } = await import("esbuild");
  const outputDirectory = path.join(root, "assets");
  await mkdir(outputDirectory, { recursive: true });
  const documents = await Promise.all(
    pages.map(async (page) => ({
      page,
      html: await readFile(path.join(root, page), "utf8"),
      styles: [],
      scripts: [],
    })),
  );
  const entryPoints = [];
  for (const document of documents) {
    for (const match of document.html.matchAll(/<link\b[^>]*>/gi)) {
      const [tag] = match;
      const href = attribute(tag, "href");
      if (
        attribute(tag, "rel")?.toLowerCase() !== "stylesheet" ||
        !href ||
        external(href)
      )
        continue;
      if (/\sdisabled(?:\s|=|\/?>)/i.test(tag))
        throw new Error(
          `Disabled stylesheets need an explicit build policy: ${href}`,
        );
      document.styles.push({ tag, href, media: attribute(tag, "media") });
    }
    const pageName = path.basename(document.page, ".html");
    for (const match of document.html.matchAll(
      /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,
    )) {
      const [tag] = match;
      const src = attribute(tag, "src");
      if (
        attribute(tag, "type")?.toLowerCase() !== "module" ||
        !src ||
        external(src)
      )
        continue;
      const name = `${pageName}${document.scripts.length ? `-${document.scripts.length + 1}` : ""}`;
      const script = { tag, src, name };
      document.scripts.push(script);
      entryPoints.push({ in: localPath(root, src, root), out: name });
    }
    if (document.styles.length) {
      const bundleStyles = (assetDirectory) =>
        build({
          absWorkingDir: root,
          stdin: {
            contents: document.styles
              .map(
                ({ href, media }) =>
                  `@import ${JSON.stringify(localPath(root, href, root))}${media ? ` ${media}` : ""};`,
              )
              .join("\n"),
            loader: "css",
            resolveDir: root,
            sourcefile: `${pageName}.css`,
          },
          bundle: true,
          minify: true,
          legalComments: "inline",
          write: false,
          outfile: path.join(outputDirectory, `${pageName}.css`),
          plugins: [
            {
              name: "preserve-public-css-assets",
              setup(builder) {
                builder.onResolve({ filter: /.*/ }, async (args) => {
                  if (args.kind !== "url-token" || external(args.path)) return;
                  const asset = localPath(args.resolveDir, args.path, root);
                  const info = await stat(asset);
                  if (!info.isFile())
                    throw new Error(`CSS asset is not a file: ${asset}`);
                  const suffix = args.path.slice(pathname(args.path).length);
                  return {
                    path: args.path.startsWith("/")
                      ? args.path
                      : `${relativeURL(assetDirectory, asset)}${suffix}`,
                    external: true,
                  };
                });
              },
            },
          ],
        });
      const result = await bundleStyles(outputDirectory);
      const bytes = result.outputFiles[0].contents;
      const hash = createHash("sha256")
        .update(bytes)
        .digest("hex")
        .slice(0, 12);
      const href = `./assets/${pageName}-${hash}.css`;
      await writeFile(path.join(root, href), bytes);
      // The homepage's small compressed stylesheet must arrive before its
      // image gallery and enhancement scripts contend for the connection.
      // Keep all rules and their cascade order so the first paint is styled
      // identically. Compile URLs against the document rather than assets/.
      let stylesheet = `<link rel="stylesheet" href="${href}" />`;
      if (document.page === "index.html") {
        const inline = await bundleStyles(root);
        const css = inline.outputFiles[0].text.replace(
          /<\/style/gi,
          "<\\/style",
        );
        stylesheet = `<style data-home-styles data-css-source="${href}">${css}</style>`;
      }
      document.styles.forEach(({ tag }, index) => {
        document.html = document.html.replace(
          tag,
          index === 0 ? stylesheet : "",
        );
      });
    }
  }
  if (entryPoints.length) {
    const result = await build({
      absWorkingDir: root,
      entryPoints,
      outdir: outputDirectory,
      entryNames: "[name]-[hash]",
      chunkNames: "chunk-[hash]",
      bundle: true,
      splitting: true,
      minify: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      legalComments: "inline",
      metafile: true,
    });
    const outputs = Object.keys(result.metafile.outputs);
    const outputByPath = new Map(
      outputs.map((output) => [
        path.resolve(root, output),
        result.metafile.outputs[output],
      ]),
    );
    for (const document of documents) {
      const preload = new Set();
      const visitStaticImports = (output) => {
        const metadata = outputByPath.get(output);
        if (!metadata)
          throw new Error(`Missing bundled module metadata: ${output}`);
        for (const imported of metadata.imports) {
          if (imported.kind !== "import-statement" || imported.external)
            continue;
          const target = path.resolve(root, imported.path);
          if (preload.has(target)) continue;
          preload.add(target);
          visitStaticImports(target);
        }
      };
      for (const script of document.scripts) {
        const output = outputs.find((file) =>
          new RegExp(`^${script.name}-[A-Z0-9]+\\.js$`).test(
            path.basename(file),
          ),
        );
        if (!output)
          throw new Error(
            `No bundled entry for ${document.page}: ${script.src}`,
          );
        visitStaticImports(path.resolve(root, output));
        const src = `./${relativeURL(root, path.resolve(root, output))}`;
        document.html = document.html.replace(
          script.tag,
          script.tag.replace(
            /\bsrc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
            `src="${src}"`,
          ),
        );
      }
      if (preload.size) {
        const links = [...preload]
          .map(
            (output) =>
              `<link rel="modulepreload" href="./${relativeURL(root, output)}" />`,
          )
          .join("\n");
        document.html = /<\/head\s*>/i.test(document.html)
          ? document.html.replace(/<\/head\s*>/i, `${links}\n</head>`)
          : `${links}\n${document.html}`;
      }
    }
  }
  for (const document of documents)
    await writeFile(path.join(root, document.page), document.html);
}
