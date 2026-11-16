import { readFileSync } from "node:fs";

/**
 * Single source of truth for site settings. Reads /site.config.json and applies
 * a few environment overrides so CI / preview deploys do not need file edits.
 */
export function loadSite(env = process.env) {
  const raw = JSON.parse(readFileSync(new URL("../site.config.json", import.meta.url), "utf8"));
  const url = String(env.SITE_URL || raw.url).replace(/\/+$/, "");
  const u = new URL(url);
  return {
    ...raw,
    url,
    host: u.host,
    origin: u.origin,
    isProduction: env.ELEVENTY_ENV === "production" || env.NODE_ENV === "production" || env.CI === "true",
  };
}
