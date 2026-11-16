import { loadSite } from "../../config/site.js";
import { slugify, categorySlug, readingMinutes, countWords, truncate } from "../../config/utils.js";
import { categoryLabel } from "../../config/collections.js";

const site = loadSite();

export default {
  layout: "layouts/post.njk",
  // Posts are plain markdown — never run through Nunjucks, so `{{ }}` in code samples is safe.
  templateEngineOverride: "md",
  eleventyComputed: {
    isPost: () => true,

    permalink: (data) => {
      if (site.isProduction) {
        if (data.draft === true) return false;
        if (data.page.date > new Date()) return false;
      }
      const slug = data.slug ? slugify(data.slug) : slugify(data.page.fileSlug);
      return `/articles/${slug}/`;
    },

    catSlug: (data) => (data.category ? categorySlug(data.category) : ""),
    catLabel: (data) => (data.category ? categoryLabel(categorySlug(data.category), site.lang) : ""),

    tagItems: (data) =>
      (Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [])
        .filter((t) => typeof t === "string" && !["posts", "post", "articles"].includes(t.toLowerCase()))
        .map((name) => ({ name, slug: slugify(name) }))
        .filter((t) => t.slug),

    wordCount: (data) => countWords(data.page.rawInput || ""),
    minutes: (data) => readingMinutes(data.page.rawInput || ""),

    descriptionText: (data) => data.excerpt || data.subtitle || truncate(data.page.rawInput || "", 160),
    author: (data) => data.author || site.author.name,
    heroAlt: (data) => data.imageAlt || (data.imageCaption ? "" : data.title),
  },
};
