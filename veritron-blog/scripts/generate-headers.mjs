// Regenerates firebase.json (headers + redirects) and _site/_headers from site.config.json.
//   node scripts/generate-headers.mjs        (also run automatically by `npm run build`)
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { loadSite } from "../config/site.js";
import { slugify } from "../config/utils.js";
import { buildRules, collectImageOrigins, toFirebaseHeaders, toNetlifyHeaders } from "./lib/headers.mjs";

const site = loadSite();
const OUT = "_site";
const imgOrigins = existsSync(OUT) ? collectImageOrigins(OUT) : [];
const rules = buildRules(site, imgOrigins);

// `aliases:` in a post's front matter → permanent redirects from the old URL.
const redirects = [];
const dir = "src/articles";
for (const f of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
  const { data } = matter(readFileSync(join(dir, f), "utf8"));
  const slug = data.slug ? slugify(data.slug) : slugify(f.replace(/\.md$/, ""));
  for (const from of data.aliases || []) {
    const variants = new Set([from, from.endsWith("/") ? from.slice(0, -1) : from + "/"]);
    for (const v of variants) redirects.push({ source: v, destination: `/articles/${slug}/`, type: 301 });
  }
}

const firebase = {
  hosting: {
    public: OUT,
    cleanUrls: true,
    trailingSlash: true,
    ignore: ["firebase.json", "**/node_modules/**"], // note: dot-folders such as /.well-known must be served
    redirects,
    headers: toFirebaseHeaders(rules),
  },
};
writeFileSync("firebase.json", JSON.stringify(firebase, null, 2) + "\n");
if (existsSync(OUT)) writeFileSync(join(OUT, "_headers"), toNetlifyHeaders(rules));
console.log(`[headers] firebase.json updated — ${rules.length} header rules, ${redirects.length} redirects, img origins: ${imgOrigins.join(", ") || "none"}`);
