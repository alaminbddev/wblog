import { renderAtom } from "../config/feeds.js";

export default class {
  data() {
    return {
      pagination: { data: "collections.categories", size: 1, alias: "cat" },
      permalink: (d) => d.cat.feedUrl,
      eleventyExcludeFromCollections: true,
    };
  }
  render({ site, cat, build }) {
    return renderAtom({
      site, title: `${site.title} — ${cat.label}`, subtitle: cat.description || site.description,
      selfPath: cat.feedUrl, altPath: cat.url, posts: cat.posts.slice(0, 30), absoluteUrls: this.absoluteUrls, buildDate: build.date,
    });
  }
}
