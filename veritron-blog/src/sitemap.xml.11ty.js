import { escapeXml } from "../config/utils.js";

export default class {
  data() {
    return { permalink: "/sitemap.xml", eleventyExcludeFromCollections: true };
  }
  render({ site, collections }) {
    const urls = [];
    const add = (path, lastmod, changefreq, priority) => urls.push({ loc: encodeURI(site.url + path), lastmod, changefreq, priority });
    const newest = collections.posts[0]?.date;
    add("/", newest, "weekly", "1.0");
    add("/blog/", newest, "weekly", "0.8");
    add("/archive/", newest, "weekly", "0.6");
    add("/tags/", newest, "weekly", "0.5");
    add("/about/", undefined, "yearly", "0.5");
    add("/contact/", undefined, "yearly", "0.3");
    add("/subscribe/", undefined, "yearly", "0.3");
    for (const c of collections.categories) add(c.url, c.posts[0]?.date, "weekly", "0.6");
    for (const t of collections.tagList) add(t.url, t.posts[0]?.date, "weekly", "0.4");
    for (const p of collections.posts) add(p.url, p.data.updated || p.date, "monthly", "0.9");
    const body = urls
      .map(
        (u) =>
          `  <url>\n    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ""}\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      )
      .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  }
}
