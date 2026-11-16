// Small, dependency-free helpers shared by the Eleventy config, data files,
// build scripts and tests. Keep this file pure (no I/O) so it is easy to test.

/**
 * Unicode-aware slug. Eleventy's built-in `slugify` strips Bengali entirely,
 * which would produce empty URLs for Bengali tag names.
 */
export function slugify(input = "") {
  return String(input)
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{M}\p{N}-]+/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Strip markdown / HTML down to plain text (for word counts, search, excerpts). */
export function toPlainText(input = "") {
  return String(input)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/^---+$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(text = "") {
  const t = toPlainText(text);
  return t ? t.split(/\s+/).length : 0;
}

/** Minutes to read, never below 1. Bengali and English both read ~200 wpm here. */
export function readingMinutes(text = "", wpm = 200) {
  return Math.max(1, Math.ceil(countWords(text) / wpm));
}

export function truncate(text = "", max = 160) {
  const t = toPlainText(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, "") + "…";
}

/** "Fact-check", "fact check", "FACT-CHECK" → "fact-check" */
export function categorySlug(raw = "") {
  return slugify(raw);
}

/** Prettify an unknown category slug for display ("fact-check" → "Fact check"). */
export function prettify(slug = "") {
  const s = String(slug).replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function escapeXml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Build a table of contents from rendered HTML (h2/h3 with ids). */
export function extractToc(html = "", { levels = [2, 3] } = {}) {
  const re = /<h([1-6])\s[^>]*?id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  const items = [];
  let m;
  while ((m = re.exec(html))) {
    const level = Number(m[1]);
    if (!levels.includes(level)) continue;
    const text = m[3]
      .replace(/<a[^>]*class="[^"]*heading-anchor[^"]*"[^>]*>[\s\S]*?<\/a>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text) items.push({ level, id: m[2], text });
  }
  return items;
}

/** Is this href absolute and pointing off-site? */
export function isExternal(href = "", siteUrl = "") {
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    return new URL(href).host !== new URL(siteUrl).host;
  } catch {
    return true;
  }
}
