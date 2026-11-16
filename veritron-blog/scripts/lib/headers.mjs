// Security headers & caching rules — ONE source of truth for Firebase Hosting (firebase.json)
// and Netlify / Cloudflare Pages (_headers). Everything is derived from site.config.json.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const origin = (u) => {
  try {
    return new URL(u).origin;
  } catch {
    return null;
  }
};

/** Collect every external https origin used by <img src> in the built HTML (for img-src). */
export function collectImageOrigins(dir) {
  const found = new Set();
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".html")) {
        const html = readFileSync(p, "utf8");
        for (const m of html.matchAll(/<img\b[^>]*?\ssrc="(https:\/\/[^"]+)"/gi)) {
          const o = origin(m[1]);
          if (o) found.add(o);
        }
      }
    }
  };
  walk(dir);
  return [...found].sort();
}

export function buildCsp(site, imgOrigins = []) {
  const self = "'self'";
  const script = [self];
  const connect = [self];
  const img = [self, "data:", ...imgOrigins, ...(site.security?.extraImgHosts || [])];
  const frame = [];
  const a = site.analytics || {};

  if (a.provider === "ga4") {
    script.push("https://www.googletagmanager.com");
    connect.push("https://*.google-analytics.com", "https://*.analytics.google.com", "https://www.googletagmanager.com");
    img.push("https://*.google-analytics.com", "https://*.googletagmanager.com");
  }
  if (a.provider === "plausible") {
    const o = origin(a.plausibleSrc);
    if (o) script.push(o), connect.push(o);
  }
  if (a.provider === "umami") {
    const o = origin(a.umamiSrc);
    if (o) script.push(o), connect.push(o);
  }
  if (site.comments?.provider === "giscus") {
    script.push("https://giscus.app");
    frame.push("https://giscus.app");
  }

  const uniq = (l) => [...new Set(l)].join(" ");
  return [
    "default-src 'none'",
    `script-src ${uniq(script)}`,
    `style-src ${self}`,
    `img-src ${uniq(img)}`,
    `font-src ${self}`,
    `connect-src ${uniq(connect)}`,
    `manifest-src ${self}`,
    `worker-src ${self}`,
    frame.length ? `frame-src ${uniq(frame)}` : "frame-src 'none'",
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const PERMISSIONS = [
  "accelerometer=()", "autoplay=()", "camera=()", "display-capture=()", "geolocation=()", "gyroscope=()", "magnetometer=()",
  "microphone=()", "payment=()", "usb=()", "interest-cohort=()", "browsing-topics=()", "clipboard-write=(self)", "fullscreen=(self)",
].join(", ");

/** → [{ source, headers: { Name: value } }]  (later rules override earlier ones) */
export function buildRules(site, imgOrigins = []) {
  const base = {
    "Content-Security-Policy": buildCsp(site, imgOrigins),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": PERMISSIONS,
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-site",
    "Origin-Agent-Cluster": "?1",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Cache-Control": "public, max-age=0, must-revalidate",
  };
  if (site.security?.hsts) base["Strict-Transport-Security"] = site.security.hsts;

  return [
    { source: "/**", headers: base },
    { source: "/assets/**", headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
    { source: "/images/**", headers: { "Cache-Control": "public, max-age=2592000", "Cross-Origin-Resource-Policy": "cross-origin" } },
    { source: "/favicon.ico", headers: { "Cache-Control": "public, max-age=86400" } },
    { source: "/feed.xml", headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*", "Cross-Origin-Resource-Policy": "cross-origin" } },
    { source: "/feed.json", headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*", "Cross-Origin-Resource-Policy": "cross-origin" } },
    { source: "/feed/**", headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*", "Cross-Origin-Resource-Policy": "cross-origin" } },
    { source: "/search.json", headers: { "Cache-Control": "public, max-age=3600" } },
    { source: "/manifest.webmanifest", headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=86400" } },
    { source: "/sw.js", headers: { "Cache-Control": "no-cache", "Service-Worker-Allowed": "/", "Content-Type": "text/javascript; charset=utf-8" } },
    { source: "/.well-known/security.txt", headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } },
    { source: "/robots.txt", headers: { "Cache-Control": "public, max-age=3600" } },
    { source: "/sitemap.xml", headers: { "Cache-Control": "public, max-age=3600" } },
  ];
}

export const toFirebaseHeaders = (rules) =>
  rules.map((r) => ({ source: r.source, headers: Object.entries(r.headers).map(([key, value]) => ({ key, value })) }));

export function toNetlifyHeaders(rules) {
  const path = (s) => s.replace(/\/\*\*$/, "/*").replace(/^\/\*\*$/, "/*");
  return rules.map((r) => `${path(r.source)}\n${Object.entries(r.headers).map(([k, v]) => `  ${k}: ${v}`).join("\n")}`).join("\n\n") + "\n";
}
