import { renderAtom } from "../config/feeds.js";

export default class {
  data() {
    return { permalink: "/feed.xml", eleventyExcludeFromCollections: true };
  }
  render({ site, collections, build, eleventy }) {
    const abs = this.absoluteUrls;
    return renderAtom({ site, title: site.title, subtitle: site.description, selfPath: "/feed.xml", posts: collections.posts.slice(0, 30), absoluteUrls: abs, buildDate: build.date });
  }
}
