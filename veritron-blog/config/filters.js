import { extractToc, toPlainText, truncate, escapeXml, slugify } from "./utils.js";

export function registerFilters(eleventyConfig, site) {
  const locale = site.locale;
  const tz = site.timezone;

  const fmt = (opts) => (date) => new Date(date).toLocaleDateString(locale, { timeZone: tz, ...opts });

  eleventyConfig.addFilter("dateLong", fmt({ year: "numeric", month: "long", day: "numeric" }));
  eleventyConfig.addFilter("dateShort", fmt({ year: "numeric", month: "short", day: "numeric" }));
  eleventyConfig.addFilter("dateDay", fmt({ month: "short", day: "numeric" }));
  eleventyConfig.addFilter("dateMonthYear", fmt({ year: "numeric", month: "long" }));
  eleventyConfig.addFilter("dateYear", (d) =>
    new Date(!d || d === "now" ? Date.now() : d).toLocaleDateString(locale, { timeZone: tz, year: "numeric" })
  );
  eleventyConfig.addFilter("dateISO", (d) => new Date(d).toISOString());
  eleventyConfig.addFilter("dateYMD", (d) => new Date(d).toISOString().slice(0, 10));
  eleventyConfig.addFilter("monthName", (m) =>
    new Date(Date.UTC(2000, Number(m) - 1, 1)).toLocaleDateString(locale, { timeZone: "UTC", month: "long" })
  );
  eleventyConfig.addFilter("num", (n) => new Intl.NumberFormat(locale).format(Number(n)));

  // "{n} মিনিটে পড়ুন" | fmt({ n: 5 })  → placeholders replaced, values already formatted by caller
  eleventyConfig.addFilter("fmt", (str = "", vars = {}) =>
    String(str).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`))
  );

  eleventyConfig.addFilter("limit", (arr, n) => (Array.isArray(arr) ? arr.slice(0, n) : []));
  eleventyConfig.addFilter("slug", slugify);
  eleventyConfig.addFilter("stripTags", (s) => toPlainText(s));
  eleventyConfig.addFilter("truncate", (s, n = 160) => truncate(s, n));
  eleventyConfig.addFilter("escapeXml", escapeXml);
  eleventyConfig.addFilter("absUrl", (p = "/") => (/^https?:\/\//.test(p) ? p : site.url + (p.startsWith("/") ? p : "/" + p)));
  eleventyConfig.addFilter("navActive", (url = "", match = []) => match.some((m) => url === m || url.startsWith(m)));
  eleventyConfig.addFilter("pluck", (arr = [], key) => arr.map((x) => x?.[key]));
  eleventyConfig.addFilter("securityExpiry", (d) => new Date(new Date(d).getTime() + 300 * 864e5).toISOString());
  eleventyConfig.addFilter("toc", (html) => extractToc(html));

  // Safe JSON for <script type="application/ld+json">: prevents "</script>" breakouts.
  eleventyConfig.addFilter("jsonLd", (obj) =>
    JSON.stringify(obj).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")
  );

  // Turn relative href/src into absolute URLs (feeds, e-mail).
  const absoluteUrls = (html = "", base = site.url + "/") =>
    html.replace(/\b(href|src)="([^"]*)"/g, (m, attr, val) => {
      if (!val || /^(https?:|mailto:|tel:|data:|#|\/\/)/i.test(val)) return m;
      try {
        return `${attr}="${new URL(val, base).toString()}"`;
      } catch {
        return m;
      }
    });
  eleventyConfig.addFilter("absoluteUrls", absoluteUrls);
  eleventyConfig.addJavaScriptFunction("absoluteUrls", absoluteUrls);

  // Related posts: shared tags weigh most, then category, then series. Newest wins ties.
  eleventyConfig.addFilter("related", (posts = [], current, n = 3) => {
    if (!current) return [];
    const cd = current.data || current;
    const tags = new Set((cd.tagItems || []).map((t) => t.slug));
    return posts
      .filter((p) => p.url !== (current.url || current.page?.url))
      .map((p) => {
        const d = p.data;
        let score = 0;
        for (const t of d.tagItems || []) if (tags.has(t.slug)) score += 3;
        if (d.catSlug && d.catSlug === cd.catSlug) score += 2;
        if (d.series && d.series === cd.series) score += 2;
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.p.date - a.p.date)
      .slice(0, n)
      .map((x) => x.p);
  });

  // { newer, older } neighbours in a newest-first list.
  eleventyConfig.addFilter("adjacent", (posts = [], url) => {
    const i = posts.findIndex((p) => p.url === url);
    if (i === -1) return {};
    return { newer: posts[i - 1] || null, older: posts[i + 1] || null };
  });

  eleventyConfig.addFilter("seriesPosts", (all = {}, name) => (name && all[name]) || []);
  eleventyConfig.addFilter("searchText", (html = "", max = 2500) => truncate(toPlainText(html), max).replace(/…$/, ""));
  eleventyConfig.addFilter("obfuscateEmail", (email = "") => {
    const [user = "", domain = ""] = email.split("@");
    return { u: Buffer.from(user).toString("base64"), d: Buffer.from(domain).toString("base64"), text: `${user} [at] ${domain}` };
  });
}
