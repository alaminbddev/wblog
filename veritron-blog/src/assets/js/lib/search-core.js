// Pure search logic — shared by the browser UI and the Node test-suite.
// Works for Bengali + Latin: strips zero-width joiners, folds Bengali digits to ASCII,
// tokenises on Unicode letters/marks/numbers, and requires every query word to match (AND).

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

export function normalize(input = "") {
  return String(input)
    .normalize("NFC")
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, "")
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .toLowerCase();
}

export function tokenize(input = "") {
  return normalize(input)
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
}

/** Pre-normalise the raw index once so each keystroke is cheap. */
export function prepareIndex(raw = []) {
  return raw.map((r) => ({
    ...r,
    _t: normalize(r.t),
    _c: normalize(r.c || ""),
    _g: (r.g || []).map(normalize),
    _e: normalize(r.e || ""),
    _b: normalize(r.b || ""),
    _ts: tokenize(r.t),
  }));
}

function countOccurrences(hay, needle, cap = 5) {
  let n = 0;
  let i = 0;
  while (n < cap && (i = hay.indexOf(needle, i)) !== -1) {
    n++;
    i += needle.length;
  }
  return n;
}

/** Score one entry for one token. 0 = no match anywhere. */
function scoreToken(e, tok) {
  let s = 0;
  if (e._t.includes(tok)) {
    s += 10;
    if (e._ts.some((w) => w === tok)) s += 4; // whole word in title
    else if (e._ts.some((w) => w.startsWith(tok))) s += 2;
  }
  if (e._g.some((g) => g === tok)) s += 7;
  else if (e._g.some((g) => g.includes(tok))) s += 4;
  if (e._c.includes(tok)) s += 4;
  if (e._e.includes(tok)) s += 3;
  const b = countOccurrences(e._b, tok);
  if (b) s += Math.min(b, 5);
  return s;
}

export function search(prepared, query, { limit = 12 } = {}) {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const q = normalize(query).trim();
  const out = [];
  for (const e of prepared) {
    let total = 0;
    let ok = true;
    for (const tok of tokens) {
      const s = scoreToken(e, tok);
      if (!s) {
        ok = false;
        break;
      }
      total += s;
    }
    if (!ok) continue;
    if (tokens.length > 1 && e._t.includes(q)) total += 12; // exact phrase in title
    out.push({ entry: e, score: total });
  }
  out.sort((a, b) => b.score - a.score || String(b.entry.d).localeCompare(String(a.entry.d)));
  return out.slice(0, limit).map((x) => ({ ...x, tokens }));
}

/**
 * Split text into [{text, hit}] segments around query tokens, for safe DOM rendering
 * (never build HTML strings from content).
 */
export function highlight(text = "", tokens = []) {
  if (!tokens.length || !text) return [{ text, hit: false }];
  // Index on the normalised string only when lengths line up; otherwise fall back to plain.
  const norm = normalize(text);
  if (norm.length !== text.length) return [{ text, hit: false }];
  const ranges = [];
  for (const tok of tokens) {
    let i = 0;
    while ((i = norm.indexOf(tok, i)) !== -1) {
      ranges.push([i, i + tok.length]);
      i += tok.length;
    }
  }
  if (!ranges.length) return [{ text, hit: false }];
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [ranges[0].slice()];
  for (const r of ranges.slice(1)) {
    const last = merged[merged.length - 1];
    if (r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push(r.slice());
  }
  const segs = [];
  let pos = 0;
  for (const [a, b] of merged) {
    if (a > pos) segs.push({ text: text.slice(pos, a), hit: false });
    segs.push({ text: text.slice(a, b), hit: true });
    pos = b;
  }
  if (pos < text.length) segs.push({ text: text.slice(pos), hit: false });
  return segs;
}

/** A ~140 char window of `text` around the first token match. */
export function snippet(text = "", tokens = [], len = 140) {
  const norm = normalize(text);
  let at = -1;
  for (const tok of tokens) {
    const i = norm.indexOf(tok);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1 || norm.length !== text.length) return text.slice(0, len) + (text.length > len ? "…" : "");
  const start = Math.max(0, at - Math.floor(len / 3));
  const end = Math.min(text.length, start + len);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

/** Only same-origin relative URLs are allowed into href attributes. */
export function safeInternalUrl(u) {
  return typeof u === "string" && u.startsWith("/") && !u.startsWith("//") && !/[\u0000-\u001f\\]/.test(u) ? u : "";
}
