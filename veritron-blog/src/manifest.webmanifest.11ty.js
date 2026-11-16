export default class {
  data() {
    return { permalink: "/manifest.webmanifest", eleventyExcludeFromCollections: true };
  }
  render({ site, t }) {
    return JSON.stringify(
      {
        name: `${site.title} — ${site.tagline}`,
        short_name: site.title,
        description: site.description,
        lang: site.lang,
        dir: "ltr",
        start_url: "/?source=pwa",
        scope: "/",
        id: "/",
        display: "standalone",
        background_color: "#fbf8f3",
        theme_color: "#fbf8f3",
        categories: ["news", "education", "science"],
        icons: [
          { src: "/images/favicon/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/images/favicon/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
        shortcuts: [
          { name: t.allPosts, url: "/blog/" },
          { name: t.saved, url: "/saved/" },
        ],
      },
      null,
      2
    );
  }
}
