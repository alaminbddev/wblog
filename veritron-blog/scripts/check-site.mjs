// Post-build quality gate. Fails (exit 1) on anything that would hurt security, SEO or a11y.
//   node scripts/check-site.mjs [dir=_site]
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { JSDOM } from "jsdom";
import { loadSite } from "../config/site.js";

const DIR = process.argv[2] || "_site";
const site = loadSite();
const errors = [];
const warns = [];
const err = (page, msg) => errors.push(`${page}: ${msg}`);
const warn = (page, msg) => warns.push(`${page}: ${msg}`);

const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    statSync(p).isDirectory() ? walk(p) : files.push(p);
  }
})(DIR);
const rel = (p) => "/" + relative(DIR, p).split("\\").join("/");
const htmlFiles = files.filter((f) => f.endsWith(".html"));
const idsByPage = new Map();

const exists = (urlPath) => {
  let p = decodeURIComponent(urlPath.split("#")[0].split("?")[0]);
  if (!p.startsWith("/")) return true;
  const cand = p.endsWith("/") ? join(DIR, p, "index.html") : join(DIR, p);
  return existsSync(cand) || existsSync(join(DIR, p, "index.html"));
};

// ---------- HTML checks ----------
for (const f of htmlFiles) {
  const page = rel(f);
  const html = readFileSync(f, "utf8");
  const dom = new JSDOM(html);
  const d = dom.window.document;
  const isErrorPage = page === "/404.html";

  if (!d.documentElement.getAttribute("lang")) err(page, "missing <html lang>");
  if (!d.title.trim()) err(page, "empty <title>");
  if (!d.querySelector('meta[name="description"]')?.content.trim()) err(page, "missing meta description");
  const canon = d.querySelector('link[rel="canonical"]')?.href;
  if (!canon) err(page, "missing canonical");
  else if (!canon.startsWith(site.url + "/")) err(page, `canonical not on ${site.url}: ${canon}`);
  const h1 = d.querySelectorAll("h1").length;
  if (h1 !== 1) err(page, `expected exactly one <h1>, found ${h1}`);

  // Strict-CSP compliance: no inline script/style, no event handlers, no javascript: URLs.
  for (const s of d.querySelectorAll("script")) {
    const type = s.getAttribute("type") || "";
    if (!s.src && !/json/.test(type)) err(page, "inline <script> (violates CSP script-src 'self')");
  }
  if (d.querySelector("style")) err(page, "inline <style> (violates CSP style-src 'self')");
  for (const el of d.querySelectorAll("*")) {
    if (el.hasAttribute("style")) err(page, `inline style attribute on <${el.localName}>`);
    for (const a of el.attributes) if (/^on/i.test(a.name)) err(page, `inline handler ${a.name} on <${el.localName}>`);
    const href = el.getAttribute("href") || el.getAttribute("src") || "";
    if (/^\s*javascript:/i.test(href)) err(page, "javascript: URL");
  }

  // Images, ids, links
  for (const img of d.querySelectorAll("img")) {
    if (!img.hasAttribute("alt")) err(page, `<img> without alt: ${(img.getAttribute("src") || "").slice(0, 60)}`);
    if (/^http:\/\//i.test(img.getAttribute("src") || "")) err(page, "insecure http:// image");
  }
  const ids = new Set();
  for (const el of d.querySelectorAll("[id]")) {
    if (ids.has(el.id)) err(page, `duplicate id "${el.id}"`);
    ids.add(el.id);
  }
  idsByPage.set(page === "/index.html" ? "/" : page.replace(/index\.html$/, ""), ids);

  for (const a of d.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    if (/^(mailto:|tel:)/i.test(href)) continue;
    if (href === "#") continue; // JS-enhanced (obfuscated e-mail)
    if (/^http:\/\//i.test(href)) warn(page, `insecure link ${href}`);
    if (/^https?:\/\//i.test(href)) {
      if (a.getAttribute("target") === "_blank" && !/noopener/.test(a.getAttribute("rel") || "")) err(page, `target=_blank without rel=noopener: ${href}`);
      if (href.startsWith(site.url + "/")) warn(page, `absolute self-link (use relative): ${href}`);
      continue;
    }
    if (href.startsWith("#")) {
      if (!ids.has(decodeURIComponent(href.slice(1)))) err(page, `broken in-page anchor ${href}`);
      continue;
    }
    if (!exists(href) && !isErrorPage) err(page, `broken internal link ${href}`);
  }
  for (const el of d.querySelectorAll("link[href], script[src]")) {
    const u = el.getAttribute("href") || el.getAttribute("src");
    if (u.startsWith("/") && !u.startsWith("//") && !exists(u)) err(page, `missing asset ${u}`);
  }
  if (html.length > 150_000) warn(page, `large HTML (${(html.length / 1024).toFixed(0)} kB)`);
}

// Cross-page anchors (e.g. /about/#section)
for (const f of htmlFiles) {
  const d = new JSDOM(readFileSync(f, "utf8")).window.document;
  for (const a of d.querySelectorAll('a[href*="#"]')) {
    const h = a.getAttribute("href");
    if (h.startsWith("#") || /^https?:/.test(h)) continue;
    const [p, frag] = h.split("#");
    const ids = idsByPage.get(decodeURI(p));
    if (frag && ids && !ids.has(decodeURIComponent(frag))) err(rel(f), `broken anchor ${h}`);
  }
}

// ---------- Machine-readable files ----------
const read = (p) => readFileSync(join(DIR, p), "utf8");
const mustExist = ["feed.xml", "feed.json", "sitemap.xml", "robots.txt", "search.json", "manifest.webmanifest", "sw.js", ".well-known/security.txt", "404.html", "offline/index.html", "favicon.ico"];
for (const p of mustExist) if (!existsSync(join(DIR, p))) err("/" + p, "missing");

for (const p of files.map(rel).filter((p) => /\.(xml)$/.test(p))) {
  const dom = new JSDOM(read(p.slice(1)), { contentType: "text/xml" });
  if (dom.window.document.querySelector("parsererror")) err(p, "XML is not well-formed");
}
for (const p of ["feed.json", "search.json", "manifest.webmanifest"]) {
  try { JSON.parse(read(p)); } catch (e) { err("/" + p, "invalid JSON: " + e.message); }
}
// JSON-LD must parse
for (const f of htmlFiles) {
  const d = new JSDOM(readFileSync(f, "utf8")).window.document;
  for (const s of d.querySelectorAll('script[type="application/ld+json"]')) {
    try { JSON.parse(s.textContent); } catch (e) { err(rel(f), "invalid JSON-LD: " + e.message); }
  }
}
// Sitemap URLs must exist
for (const m of read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const u = decodeURIComponent(m[1].replace(site.url, ""));
  if (!exists(u)) err("/sitemap.xml", `lists missing page ${u}`);
}

// ---------- Security headers config ----------
if (existsSync("firebase.json")) {
  const fb = JSON.parse(readFileSync("firebase.json", "utf8"));
  const all = fb.hosting.headers.find((h) => h.source === "/**");
  const val = (k) => all?.headers.find((h) => h.key.toLowerCase() === k.toLowerCase())?.value || "";
  const csp = val("Content-Security-Policy");
  if (!csp) err("firebase.json", "no Content-Security-Policy");
  if (/unsafe-inline|unsafe-eval|\*(?!\.)/.test(csp.replace(/https:\/\/\*\./g, ""))) err("firebase.json", "CSP contains unsafe-* or wildcard source");
  for (const k of ["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "Strict-Transport-Security", "X-Frame-Options"]) if (!val(k)) err("firebase.json", `missing header ${k}`);
  if (!/frame-ancestors 'none'/.test(csp)) err("firebase.json", "CSP lacks frame-ancestors 'none'");
  // every external host used by pages must be allowed in CSP img-src
  for (const f of htmlFiles) {
    const html = readFileSync(f, "utf8");
    for (const m of html.matchAll(/<img\b[^>]*?\ssrc="(https:\/\/[^/"]+)/gi)) if (!csp.includes(m[1])) err(rel(f), `image host ${m[1]} blocked by CSP`);
  }
  if (fb.hosting.ignore.some((g) => g === "**/.*")) err("firebase.json", "ignore pattern **/.* would block /.well-known");
}

// ---------- Size budget ----------
const assetBytes = files.filter((f) => /\/assets\/(css|js)\//.test(rel(f)) && !f.includes("/chunks/")).reduce((n, f) => n + statSync(f).size, 0);
if (assetBytes > 90 * 1024) warn("assets", `critical css+js is ${(assetBytes / 1024).toFixed(0)} kB (budget 90 kB raw)`);

// ---------- Report ----------
console.log(`[check] ${htmlFiles.length} pages, ${files.length} files in ${DIR}/`);
warns.slice(0, 30).forEach((w) => console.log("  warn  " + w));
if (warns.length > 30) console.log(`  … ${warns.length - 30} more warnings`);
if (errors.length) {
  errors.slice(0, 60).forEach((e) => console.log("  ERROR " + e));
  if (errors.length > 60) console.log(`  … ${errors.length - 60} more errors`);
  console.log(`[check] FAILED with ${errors.length} error(s)`);
  process.exit(1);
}
console.log(`[check] OK — 0 errors, ${warns.length} warning(s)`);
