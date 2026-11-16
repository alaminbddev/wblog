// Bundles, minifies and content-hashes CSS, JS and fonts with esbuild.
// Output: .cache/assets/**  (copied to _site/assets by Eleventy)
//         .cache/assets-manifest.json  (logical name → hashed public URL)
//
//   node scripts/build-assets.mjs           one-off production build
//   node scripts/build-assets.mjs --watch   rebuild on change (dev server)
import * as esbuild from "esbuild";
import { rmSync, mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, relative } from "node:path";

const WATCH = process.argv.includes("--watch");
const ROOT = process.cwd();
const OUT = ".cache/assets";
const MANIFEST = ".cache/assets-manifest.json";
const PUBLIC = "/assets";

const state = { css: "", js: "", theme: "", fonts: {}, files: [] };
const parts = { css: null, esm: null, iife: null };

const toPublic = (file) => `${PUBLIC}/${relative(OUT, file).split("\\").join("/")}`;

function ingest(kind, meta) {
  parts[kind] = meta;
  const files = new Set();
  state.fonts = {};
  for (const m of Object.values(parts)) {
    if (!m) continue;
    for (const [file, info] of Object.entries(m.outputs)) {
      if (file.endsWith(".map")) continue;
      const pub = toPublic(file);
      files.add(pub);
      const entry = info.entryPoint || "";
      if (entry.endsWith("main.css")) state.css = pub;
      else if (entry.endsWith("/main.js")) state.js = pub;
      else if (entry.endsWith("/theme.js")) state.theme = pub;
      const f = pub.match(/tiro-bangla-(bengali|latin|latin-ext)-400-normal-/);
      if (f) state.fonts[f[1].replace("-ext", "Ext")] = pub;
    }
  }
  state.files = [...files].sort();
}

function writeManifest() {
  if (!state.css || !state.js || !state.theme) return; // wait until all three builds have reported
  mkdirSync(".cache", { recursive: true });
  const precache = ["/offline/", state.css, state.js, state.theme, state.fonts.bengali, state.fonts.latin].filter(Boolean);
  writeFileSync(MANIFEST, JSON.stringify({ css: state.css, js: state.js, theme: state.theme, fonts: state.fonts, precache }, null, 2));
}

const manifestPlugin = (kind) => ({
  name: "manifest",
  setup(b) {
    b.onEnd((r) => {
      if (r.errors.length) return;
      ingest(kind, r.metafile);
      writeManifest();
    });
  },
});

const common = { bundle: true, minify: true, metafile: true, logLevel: "warning", legalComments: "none" };

const cssOpts = {
  ...common,
  entryPoints: ["src/assets/css/main.css"],
  outdir: join(OUT, "css"),
  entryNames: "[name]-[hash]",
  assetNames: "../fonts/[name]-[hash]",
  publicPath: PUBLIC + "/css",
  loader: { ".woff2": "file" },
  target: ["chrome100", "firefox100", "safari15"],
  plugins: [manifestPlugin("css")],
};

// Main app: ES modules with code-splitting so search/comments/lightbox load on demand.
const esmOpts = {
  ...common,
  entryPoints: ["src/assets/js/main.js"],
  outdir: join(OUT, "js"),
  entryNames: "[name]-[hash]",
  chunkNames: "chunks/[name]-[hash]",
  format: "esm",
  splitting: true,
  target: "es2020",
  plugins: [manifestPlugin("esm")],
};

// Tiny blocking script that applies the saved theme before first paint (no flash).
const iifeOpts = {
  ...common,
  entryPoints: ["src/assets/js/theme.js"],
  outdir: join(OUT, "js"),
  entryNames: "[name]-[hash]",
  format: "iife",
  target: "es2017",
  plugins: [manifestPlugin("iife")],
};

if (WATCH) {
  rmSync(OUT, { recursive: true, force: true });
  rmSync(MANIFEST, { force: true });
  const ctxs = await Promise.all([cssOpts, esmOpts, iifeOpts].map((o) => esbuild.context({ ...o, minify: false })));
  await Promise.all(ctxs.map((c) => c.watch()));
  console.log("[assets] watching src/assets …");
} else {
  rmSync(OUT, { recursive: true, force: true });
  await Promise.all([esbuild.build(cssOpts), esbuild.build(esmOpts), esbuild.build(iifeOpts)]);
  const rows = state.files.map((pub) => {
    const abs = join(ROOT, ".cache", pub.replace(/^\/assets/, "assets"));
    const buf = readFileSync(abs);
    return { pub, raw: buf.length, gz: gzipSync(buf).length };
  });
  const kb = (n) => (n / 1024).toFixed(1).padStart(7) + " kB";
  console.log("[assets] built:");
  for (const r of rows) console.log(`  ${r.pub.padEnd(58)} ${kb(r.raw)}  gzip ${kb(r.gz)}`);
  const total = (k) => rows.filter((r) => !r.pub.includes("/fonts/")).reduce((n, r) => n + r[k], 0);
  console.log(`[assets] css+js total: ${kb(total("raw"))} raw, ${kb(total("gz"))} gzip`);
  void statSync;
}
