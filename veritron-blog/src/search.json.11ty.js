import { toPlainText, truncate } from "../config/utils.js";

// Client-side search index: loaded lazily when the search dialog opens.
export default class {
  data() {
    return { permalink: "/search.json", eleventyExcludeFromCollections: true };
  }
  render({ collections }) {
    const posts = collections.posts.map((p) => ({
      t: p.data.title,
      u: p.url,
      d: p.date.toISOString().slice(0, 10),
      c: p.data.catLabel || "",
      g: (p.data.tagItems || []).map((x) => x.name),
      e: p.data.descriptionText || "",
      b: truncate(toPlainText(p.templateContent || ""), 2500).replace(/…$/, ""),
    }));
    const tags = collections.tagList.slice(0, 40).map((t) => ({ n: t.name, u: t.url, c: t.count }));
    return JSON.stringify({ posts, tags });
  }
}
