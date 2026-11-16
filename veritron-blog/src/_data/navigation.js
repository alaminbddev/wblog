import t from "./t.js";

export default function () {
  const tr = t();
  return [
    { key: "blog", label: tr.blog, url: "/blog/", match: ["/blog/", "/articles/", "/category/"] },
    { key: "topics", label: tr.topics, url: "/tags/", match: ["/tags/", "/tag/"] },
    { key: "archive", label: tr.archive, url: "/archive/", match: ["/archive/"] },
    { key: "about", label: tr.about, url: "/about/", match: ["/about/"] },
  ];
}
