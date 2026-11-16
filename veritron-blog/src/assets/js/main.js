import { $ } from "./lib/dom.js";
import { initTheme, initNav, initProgress, initToc, initCodeCopy, initHeadingLinks, initShare, initTextSize, initBackToTop, initEmail, initRandom, initOffline } from "./modules/ui.js";
import { initSave } from "./modules/save.js";

// Client config + strings are rendered by the server into a JSON data block
// (not executable, so it is compatible with a strict CSP).
let I = { t: {}, features: {} };
try {
  I = JSON.parse($("#app-config")?.textContent || "{}");
} catch {}
const f = I.features || {};

const safe = (fn) => {
  try {
    fn();
  } catch (err) {
    console.error(err);
  }
};

safe(() => f.themeToggle !== false && initTheme(I));
safe(initNav);
safe(() => f.readingProgress && initProgress());
safe(() => f.toc && initToc());
safe(() => initCodeCopy(I));
safe(() => initHeadingLinks(I));
safe(() => f.share && initShare(I));
safe(() => f.textSize && initTextSize());
safe(() => f.backToTop && initBackToTop());
safe(initEmail);
safe(() => f.savedPosts && initSave(I));
safe(() => initRandom());
safe(() => initOffline(I));

// Heavier / optional features are split into separate chunks and loaded on demand.
if (f.search) import("./modules/search.js").then((m) => safe(() => m.initSearch(I)));
if ($("[data-post-body] img[data-zoom]") && f.lightbox) import("./modules/lightbox.js").then((m) => safe(() => m.initLightbox(I)));
if ($("[data-comments]")) import("./modules/comments.js").then((m) => safe(() => m.initComments(I)));
if (I.analytics && I.analytics.provider !== "none") import("./modules/analytics.js").then((m) => safe(() => m.initAnalytics(I)));

if (f.pwa && "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {}));
}
