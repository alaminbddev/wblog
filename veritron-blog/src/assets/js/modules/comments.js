import { $ } from "../lib/dom.js";

// Giscus (GitHub Discussions). Loaded lazily, only when configured and only near the viewport.
export function initComments(I) {
  const box = $("[data-comments]");
  const cfg = I.comments;
  if (!box || !cfg || cfg.provider !== "giscus" || !cfg.giscus?.repo) return;
  const theme = () => document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  const load = () => {
    const s = document.createElement("script");
    s.src = "https://giscus.app/client.js";
    s.async = true;
    s.crossOrigin = "anonymous";
    const g = cfg.giscus;
    const attrs = {
      repo: g.repo, "repo-id": g.repoId, category: g.category, "category-id": g.categoryId,
      mapping: "pathname", strict: "1", "reactions-enabled": "1", "emit-metadata": "0",
      "input-position": "top", theme: theme(), lang: I.lang, loading: "lazy",
    };
    for (const [k, v] of Object.entries(attrs)) s.setAttribute(`data-${k}`, v);
    box.append(s);
    document.addEventListener("themechange", () => {
      $("iframe.giscus-frame", box)?.contentWindow?.postMessage({ giscus: { setConfig: { theme: theme() } } }, "https://giscus.app");
    });
  };

  if (!("IntersectionObserver" in window)) return load();
  const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && (io.disconnect(), load()), { rootMargin: "400px" });
  io.observe(box);
}
