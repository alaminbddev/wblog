// Lightweight secret scanner for CI / pre-commit. Fails if tracked-looking files contain credentials.
//   node scripts/scan-secrets.mjs            scan the working tree
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const IGNORE_DIRS = new Set(["node_modules", ".git", "_site", ".cache"]);
const IGNORE_FILES = new Set(["package-lock.json", "scan-secrets.mjs"]);
const TEXT = /\.(js|mjs|cjs|json|md|njk|html|css|txt|yml|yaml|toml|env|example|webmanifest|xml)$/i;

const RULES = [
  ["MongoDB URI with credentials", /mongodb(\+srv)?:\/\/[^\s:@/]+:[^\s@/]+@/i],
  ["Generic URL with embedded password", /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:(?!\*+@|<|\$|\{)[^\s@/]{4,}@[^\s/]+/i],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ["Private key block", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["Firebase/Google service account", /"private_key_id"\s*:/],
  ["Hard-coded secret assignment", /\b(?:secret|passwd|password|api[_-]?key|token)\s*[:=]\s*["'][^"'\s]{12,}["']/i],
];

const hits = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!IGNORE_DIRS.has(name)) walk(p);
      continue;
    }
    if (IGNORE_FILES.has(name) || st.size > 1_500_000) continue;
    if (name === ".env" || (name.startsWith(".env.") && name !== ".env.example")) hits.push([p, 0, "A real .env file is present (must never be committed)"]);
    if (!TEXT.test(name) && !name.startsWith(".env")) continue;
    readFileSync(p, "utf8").split("\n").forEach((line, i) => {
      for (const [label, re] of RULES) if (re.test(line)) hits.push([p, i + 1, label]);
    });
  }
})(".");

if (hits.length) {
  for (const [f, l, why] of hits) console.error(`  ✖ ${f}${l ? ":" + l : ""} — ${why}`);
  console.error(`[secrets] ${hits.length} potential secret(s) found`);
  process.exit(1);
}
console.log("[secrets] OK — nothing suspicious found");
