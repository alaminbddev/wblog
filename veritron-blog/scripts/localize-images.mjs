// Downloads remote post images (front-matter `image:`) into src/images/posts/ and rewrites the front matter.
// Result: no third-party image requests (better privacy/perf), and a stricter CSP (img-src 'self').
//   npm run images:localize            do it
//   npm run images:localize -- --dry   only list what would change
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";

const DRY = process.argv.includes("--dry");
const DIR = "src/articles";
const OUT = "src/images/posts";
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };
mkdirSync(OUT, { recursive: true });

let changed = 0;
for (const f of readdirSync(DIR).filter((n) => n.endsWith(".md"))) {
  const path = join(DIR, f);
  const src = readFileSync(path, "utf8");
  const m = src.match(/^image:\s*["']?(https:\/\/[^"'\n]+)["']?\s*$/m);
  if (!m) continue;
  const url = m[1];
  const slug = basename(f, ".md").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  if (DRY) { console.log(`would fetch ${url.slice(0, 70)}… → ${slug}`); continue; }
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = (res.headers.get("content-type") || "").split(";")[0];
    const ext = EXT[type];
    if (!ext) throw new Error(`unsupported content-type ${type}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) throw new Error("image larger than 8 MB");
    const name = `${slug}-${createHash("sha1").update(buf).digest("hex").slice(0, 8)}.${ext}`;
    writeFileSync(join(OUT, name), buf);
    writeFileSync(path, src.replace(m[0], `image: "/images/posts/${name}"`));
    changed++;
    console.log(`✔ ${f} → /images/posts/${name} (${(buf.length / 1024).toFixed(0)} kB)`);
  } catch (e) {
    console.error(`✖ ${f}: ${e.message}`);
  }
}
console.log(DRY ? "[images] dry run complete" : `[images] localised ${changed} image(s). Run \`npm run build\` — the CSP will now drop the external image host.`);
