// npm run new -- "My post title" [--category=science] [--publish]
import { existsSync, writeFileSync } from "node:fs";
import { loadSite } from "../config/site.js";
import { slugify } from "../config/utils.js";

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => { const [k, v = "true"] = a.slice(2).split("="); return [k, v]; }));
const title = args.filter((a) => !a.startsWith("--")).join(" ").trim();
if (!title) {
  console.error('Usage: npm run new -- "Post title" [--category=science] [--publish] [--slug=custom-slug]');
  process.exit(1);
}
const site = loadSite();
const today = new Intl.DateTimeFormat("en-CA", { timeZone: site.timezone }).format(new Date()); // YYYY-MM-DD
const slug = slugify(flags.slug || title) || `post-${today}`;
const file = `src/articles/${slug}.md`;
if (existsSync(file)) {
  console.error(`Refusing to overwrite ${file}`);
  process.exit(1);
}
const q = (s) => JSON.stringify(s);
writeFileSync(
  file,
  `---
title: ${q(title)}
date: ${today}
category: ${q(flags.category || "science")}
tags: []
excerpt: ""            # 1–2 sentences; used in cards, search, feeds and social previews
featured: false
draft: ${flags.publish ? "false" : "true"}            # drafts show in `npm start` only; set false to publish
# subtitle: ""
# image: "/images/posts/${slug}.jpg"
# imageAlt: ""
# imageCaption: ""
# updated: ${today}
# series: ""           # group posts into a series; order with seriesOrder: 1
# aliases: []          # old URLs that should redirect here
---

Write here. Use \`##\` headings — three or more automatically produce a table of contents.
`
);
console.log(`Created ${file} (draft: visible in \`npm start\`, hidden in production builds until you set draft: false)`);
