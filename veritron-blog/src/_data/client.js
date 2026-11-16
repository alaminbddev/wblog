import { loadSite } from "../../config/site.js";
import t from "./t.js";

// The only data the browser JS receives (rendered into a JSON block on every page).
const KEYS = ["themeAuto", "themeLight", "themeDark", "themeToggle", "copyCode", "codeCopied", "copied", "save", "unsave", "saved",
  "zoomClose", "searchNone", "searchLoading", "searchError", "searchRecent", "searchTopics", "searchCount", "postCount"];

export default function () {
  const site = loadSite();
  const tr = t();
  const a = site.analytics;
  return {
    lang: site.lang,
    locale: site.locale,
    timezone: site.timezone,
    features: site.features,
    analytics: { provider: a.provider, ga4Id: a.ga4Id, plausibleDomain: a.plausibleDomain, plausibleSrc: a.plausibleSrc, umamiId: a.umamiId, umamiSrc: a.umamiSrc },
    comments: site.comments,
    t: Object.fromEntries(KEYS.map((k) => [k, tr[k]])),
  };
}
