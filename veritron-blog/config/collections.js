import { readFileSync } from "node:fs";
import { categorySlug, slugify, prettify, chunk } from "./utils.js";

const categoryMeta = JSON.parse(readFileSync(new URL("../src/_data/categories.json", import.meta.url), "utf8"));

export function categoryLabel(slug, lang) {
  return categoryMeta[slug]?.[lang]?.label || prettify(slug);
}
export function categoryDescription(slug, lang) {
  return categoryMeta[slug]?.[lang]?.description || "";
}

export function registerCollections(eleventyConfig, site) {
  const lang = site.lang;
  const perPage = site.postsPerPage || 9;

  const isVisible = (p) => {
    if (p.data.draft === true && site.isProduction) return false;
    if (site.isProduction && p.date > new Date()) return false; // scheduled posts
    return true;
  };

  const getPosts = (api) =>
    api
      .getFilteredByGlob("src/articles/*.md")
      .filter(isVisible)
      .sort((a, b) => b.date - a.date || a.inputPath.localeCompare(b.inputPath));

  const pagesFor = (kind, base, items, extra) => {
    const parts = chunk(items, perPage);
    const total = Math.max(parts.length, 1);
    return (parts.length ? parts : [[]]).map((posts, i) => ({
      kind,
      ...extra,
      n: i + 1,
      total,
      posts,
      count: items.length,
      url: i === 0 ? `${base}/` : `${base}/page/${i + 1}/`,
      baseUrl: `${base}/`,
    }));
  };

  eleventyConfig.addCollection("posts", (api) => getPosts(api));

  eleventyConfig.addCollection("featuredPosts", (api) => getPosts(api).filter((p) => p.data.featured === true));

  eleventyConfig.addCollection("categories", (api) => {
    const map = new Map();
    for (const p of getPosts(api)) {
      const slug = p.data.catSlug;
      if (!slug) continue;
      if (!map.has(slug)) map.set(slug, []);
      map.get(slug).push(p);
    }
    return [...map.entries()]
      .map(([slug, posts]) => ({
        slug,
        label: categoryLabel(slug, lang),
        description: categoryDescription(slug, lang),
        url: `/category/${slug}/`,
        feedUrl: `/feed/${slug}.xml`,
        posts,
        count: posts.length,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, site.locale));
  });

  eleventyConfig.addCollection("tagList", (api) => {
    const map = new Map();
    for (const p of getPosts(api)) {
      for (const t of p.data.tagItems || []) {
        if (!map.has(t.slug)) map.set(t.slug, { name: t.name, slug: t.slug, posts: [] });
        map.get(t.slug).posts.push(p);
      }
    }
    return [...map.values()]
      .map((t) => ({ ...t, count: t.posts.length, url: `/tag/${t.slug}/` }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, site.locale));
  });

  // ---- Paginated listings (one entry per output page) ----
  eleventyConfig.addCollection("blogPages", (api) => pagesFor("blog", "/blog", getPosts(api), {}));

  eleventyConfig.addCollection("categoryPages", (api) => {
    const posts = getPosts(api);
    const cats = new Map();
    for (const p of posts) {
      const s = p.data.catSlug;
      if (s) cats.set(s, [...(cats.get(s) || []), p]);
    }
    return [...cats.entries()].flatMap(([slug, items]) =>
      pagesFor("category", `/category/${slug}`, items, {
        slug,
        label: categoryLabel(slug, lang),
        description: categoryDescription(slug, lang),
        feedUrl: `/feed/${slug}.xml`,
      })
    );
  });

  eleventyConfig.addCollection("tagPages", (api) => {
    const tags = new Map();
    for (const p of getPosts(api)) {
      for (const t of p.data.tagItems || []) {
        if (!tags.has(t.slug)) tags.set(t.slug, { name: t.name, posts: [] });
        tags.get(t.slug).posts.push(p);
      }
    }
    return [...tags.entries()].flatMap(([slug, t]) =>
      pagesFor("tag", `/tag/${slug}`, t.posts, { slug, label: t.name, description: "" })
    );
  });

  // Year → month → posts, newest first (archive page).
  eleventyConfig.addCollection("archive", (api) => {
    const years = new Map();
    for (const p of getPosts(api)) {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: site.timezone, year: "numeric", month: "numeric" }).formatToParts(p.date);
      const y = Number(parts.find((x) => x.type === "year").value);
      const m = Number(parts.find((x) => x.type === "month").value);
      if (!years.has(y)) years.set(y, new Map());
      const months = years.get(y);
      if (!months.has(m)) months.set(m, []);
      months.get(m).push(p);
    }
    return [...years.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => ({
        year,
        count: [...months.values()].reduce((n, l) => n + l.length, 0),
        months: [...months.entries()].sort((a, b) => b[0] - a[0]).map(([month, posts]) => ({ month, posts })),
      }));
  });

  // Series name → posts in reading order (oldest first unless seriesOrder is set).
  eleventyConfig.addCollection("seriesMap", (api) => {
    const out = {};
    for (const p of getPosts(api)) {
      const s = p.data.series;
      if (!s) continue;
      (out[s] ||= []).push(p);
    }
    for (const list of Object.values(out)) {
      list.sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0) || a.date - b.date);
    }
    return [out]; // wrapped so it can be used as a single object via collections.seriesMap[0]
  });

  // Collected redirects from `aliases:` front matter → consumed by scripts/generate-headers.mjs
  eleventyConfig.addCollection("redirects", (api) =>
    getPosts(api).flatMap((p) => (p.data.aliases || []).map((from) => ({ from, to: p.url })))
  );
}
