import { $, store } from "../lib/dom.js";

function addScript(src, attrs = {}) {
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.append(s);
}

// Cookieless providers load directly. GA4 sets cookies, so it waits for explicit consent.
export function initAnalytics(I) {
  const a = I.analytics;
  if (!a || a.provider === "none") return;

  if (a.provider === "plausible" && a.plausibleDomain) {
    return addScript(a.plausibleSrc, { defer: "", "data-domain": a.plausibleDomain });
  }
  if (a.provider === "umami" && a.umamiId) {
    return addScript(a.umamiSrc, { defer: "", "data-website-id": a.umamiId });
  }
  if (a.provider !== "ga4" || !a.ga4Id) return;

  const banner = $("[data-consent]");
  const loadGA = () => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", a.ga4Id, { anonymize_ip: true });
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(a.ga4Id)}`);
  };
  const choice = store.get("consent");
  if (choice === "granted") return loadGA();
  if (choice === "denied" || !banner) return;
  banner.hidden = false;
  $("[data-consent-accept]", banner)?.addEventListener("click", () => {
    store.set("consent", "granted");
    banner.hidden = true;
    loadGA();
  });
  $("[data-consent-decline]", banner)?.addEventListener("click", () => {
    store.set("consent", "denied");
    banner.hidden = true;
  });
  $("[data-consent-reset]")?.addEventListener("click", () => {
    store.set("consent", null);
    location.reload();
  });
}
