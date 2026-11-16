import test from "node:test";
import assert from "node:assert/strict";
import { buildCsp, buildRules, toNetlifyHeaders } from "../scripts/lib/headers.mjs";

const base = { analytics: { provider: "none" }, comments: { provider: "none" }, security: { hsts: "max-age=31536000" } };

test("default CSP is locked down: no unsafe-*, no external scripts", () => {
  const csp = buildCsp(base, ["https://images.unsplash.com"]);
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.match(csp, /style-src 'self'(;|$)/);
  assert.match(csp, /img-src 'self' data: https:\/\/images\.unsplash\.com/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.doesNotMatch(csp, /unsafe-/);
});

test("GA4 and giscus widen the CSP only when enabled", () => {
  const ga = buildCsp({ ...base, analytics: { provider: "ga4" } });
  assert.match(ga, /script-src 'self' https:\/\/www\.googletagmanager\.com/);
  const g = buildCsp({ ...base, comments: { provider: "giscus" } });
  assert.match(g, /frame-src https:\/\/giscus\.app/);
  assert.doesNotMatch(buildCsp(base), /giscus|googletagmanager/);
});

test("rules include HSTS, nosniff, immutable assets and no-cache service worker", () => {
  const rules = buildRules(base);
  const all = rules.find((r) => r.source === "/**").headers;
  assert.equal(all["X-Content-Type-Options"], "nosniff");
  assert.ok(all["Strict-Transport-Security"]);
  assert.match(rules.find((r) => r.source === "/assets/**").headers["Cache-Control"], /immutable/);
  assert.equal(rules.find((r) => r.source === "/sw.js").headers["Cache-Control"], "no-cache");
});

test("Netlify/Cloudflare _headers output is well-formed", () => {
  const out = toNetlifyHeaders(buildRules(base));
  assert.match(out, /^\/\*\n {2}Content-Security-Policy: /);
  assert.match(out, /\n\/assets\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/);
});
