// JSON Feed 1.1 — https://www.jsonfeed.org/version/1.1/
export default class {
  data() {
    return { permalink: "/feed.json", eleventyExcludeFromCollections: true };
  }
  render({ site, collections }) {
    return JSON.stringify(
      {
        version: "https://jsonfeed.org/version/1.1",
        title: site.title,
        home_page_url: site.url + "/",
        feed_url: site.url + "/feed.json",
        description: site.description,
        language: site.lang,
        authors: [{ name: site.author.name, url: site.url + "/about/" }],
        items: collections.posts.slice(0, 30).map((p) => ({
          id: site.url + p.url,
          url: site.url + p.url,
          title: p.data.title,
          summary: p.data.descriptionText,
          content_html: this.absoluteUrls(p.templateContent || "", site.url + p.url),
          image: p.data.image || undefined,
          date_published: p.date.toISOString(),
          date_modified: new Date(p.data.updated || p.date).toISOString(),
          tags: [p.data.catLabel, ...(p.data.tagItems || []).map((t) => t.name)].filter(Boolean),
        })),
      },
      null,
      2
    );
  }
}
