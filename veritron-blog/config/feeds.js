import { escapeXml, truncate } from "./utils.js";

/** Render an Atom 1.0 feed with full content (newsletter-friendly) and absolute URLs. */
export function renderAtom({ site, title, subtitle, selfPath, altPath = "/", posts, absoluteUrls, buildDate }) {
  const self = site.url + selfPath;
  const alt = site.url + altPath;
  const updated = (posts[0]?.date || buildDate).toISOString();
  const entries = posts
    .map((p) => {
      const url = site.url + p.url;
      const d = p.data;
      const html = absoluteUrls(p.templateContent || "", url);
      return `  <entry>
    <title>${escapeXml(d.title)}</title>
    <link rel="alternate" type="text/html" href="${escapeXml(url)}"/>
    <id>${escapeXml(url)}</id>
    <published>${p.date.toISOString()}</published>
    <updated>${new Date(d.updated || p.date).toISOString()}</updated>
    ${d.catLabel ? `<category term="${escapeXml(d.catSlug)}" label="${escapeXml(d.catLabel)}"/>` : ""}
    ${(d.tagItems || []).map((t) => `<category term="${escapeXml(t.slug)}" label="${escapeXml(t.name)}"/>`).join("\n    ")}
    <summary>${escapeXml(d.descriptionText || truncate(html, 200))}</summary>
    <content type="html">${escapeXml(html)}</content>
  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${escapeXml(site.lang)}">
  <title>${escapeXml(title)}</title>
  <subtitle>${escapeXml(subtitle)}</subtitle>
  <link rel="self" type="application/atom+xml" href="${escapeXml(self)}"/>
  <link rel="alternate" type="text/html" href="${escapeXml(alt)}"/>
  <id>${escapeXml(self)}</id>
  <updated>${updated}</updated>
  <author><name>${escapeXml(site.author.name)}</name><uri>${escapeXml(site.url)}/about/</uri></author>
  <generator>Eleventy</generator>
${entries}
</feed>
`;
}
