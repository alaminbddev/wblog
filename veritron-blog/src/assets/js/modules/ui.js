import { $, $$, el, store, toast, copyText, reducedMotion, fmt } from "../lib/dom.js";

/* ---------- Theme (auto → light → dark) ---------- */
export function initTheme(I) {
  const btns = $$("[data-theme-toggle]");
  if (!btns.length) return;
  const root = document.documentElement;
  const order = ["auto", "light", "dark"];
  const names = { auto: I.t.themeAuto, light: I.t.themeLight, dark: I.t.themeDark };
  const metas = $$('meta[name="theme-color"]');
  const colors = { light: "#fbf8f3", dark: "#14120f" };

  const effective = (pref) => (pref === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : pref);
  const paint = (pref) => {
    for (const b of btns) {
      const label = `${I.t.themeToggle}: ${names[pref]}`;
      b.setAttribute("aria-label", label);
      b.setAttribute("title", label);
    }
    // Explicit choice overrides the media-specific theme-color metas.
    metas.forEach((m, i) => {
      if (!m.dataset.media) m.dataset.media = m.getAttribute("media") || "";
      if (pref === "auto") {
        if (m.dataset.media) m.setAttribute("media", m.dataset.media);
        m.setAttribute("content", i === 0 ? colors.light : colors.dark);
      } else {
        m.removeAttribute("media");
        m.setAttribute("content", colors[effective(pref)]);
      }
    });
  };
  const apply = (pref) => {
    root.setAttribute("data-theme-pref", pref);
    if (pref === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", pref);
    store.set("theme", pref === "auto" ? null : pref);
    paint(pref);
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: effective(pref) } }));
  };
  paint(root.getAttribute("data-theme-pref") || "auto");
  btns.forEach((b) =>
    b.addEventListener("click", () => {
      const cur = root.getAttribute("data-theme-pref") || "auto";
      apply(order[(order.indexOf(cur) + 1) % order.length]);
    })
  );
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if ((root.getAttribute("data-theme-pref") || "auto") === "auto") apply("auto");
  });
}

/* ---------- Mobile menu (<details>) ---------- */
export function initNav() {
  const menu = $("[data-nav-menu]");
  if (!menu) return;
  const close = () => menu.removeAttribute("open");
  document.addEventListener("click", (e) => menu.hasAttribute("open") && !menu.contains(e.target) && close());
  document.addEventListener("keydown", (e) => e.key === "Escape" && close());
  menu.addEventListener("click", (e) => e.target.closest("a") && close());
}

/* ---------- Reading progress bar ---------- */
export function initProgress() {
  const bar = $("[data-progress-bar]");
  const body = $("[data-post-body]");
  if (!bar || !body) return;
  const wrap = bar.parentElement;
  wrap.hidden = false;
  let ticking = false;
  const update = () => {
    ticking = false;
    const rect = body.getBoundingClientRect();
    const total = rect.height - innerHeight * 0.5;
    const done = Math.min(Math.max(-rect.top + innerHeight * 0.15, 0), Math.max(total, 1));
    const p = total <= 0 ? 1 : done / total;
    bar.style.transform = `scaleX(${Math.min(Math.max(p, 0), 1).toFixed(4)})`;
    wrap.setAttribute("aria-valuenow", String(Math.round(p * 100)));
  };
  const onScroll = () => !ticking && ((ticking = true), requestAnimationFrame(update));
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
  update();
}

/* ---------- Table of contents scroll-spy ---------- */
export function initToc() {
  const links = $$("[data-toc] a[href^='#']");
  if (!links.length || !("IntersectionObserver" in window)) return;
  const map = new Map();
  for (const a of links) {
    const id = decodeURIComponent(a.getAttribute("href").slice(1));
    const h = document.getElementById(id);
    if (h) map.set(h, a);
  }
  const visible = new Set();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target));
      const first = [...map.keys()].find((h) => visible.has(h));
      if (!first) return;
      links.forEach((a) => a.removeAttribute("aria-current"));
      map.get(first).setAttribute("aria-current", "true");
    },
    { rootMargin: "0px 0px -65% 0px", threshold: 0 }
  );
  map.forEach((_, h) => io.observe(h));
}

/* ---------- Copy buttons on code blocks ---------- */
export function initCodeCopy(I) {
  $$("[data-post-body] pre").forEach((pre) => {
    if (pre.parentElement?.classList.contains("code-block")) return;
    const wrap = el("div", { class: "code-block" });
    pre.replaceWith(wrap);
    const btn = el("button", { type: "button", class: "code-copy", text: I.t.copyCode, "aria-label": I.t.copyCode });
    wrap.append(pre, btn);
    btn.addEventListener("click", async () => {
      if (await copyText(pre.innerText.replace(/\n$/, ""))) {
        btn.textContent = I.t.codeCopied;
        setTimeout(() => (btn.textContent = I.t.copyCode), 1600);
      }
    });
  });
}

/* ---------- Click a heading "#" to copy its deep link ---------- */
export function initHeadingLinks(I) {
  document.addEventListener("click", async (e) => {
    const a = e.target.closest?.("a.heading-anchor");
    if (!a) return;
    const url = location.origin + location.pathname + a.getAttribute("href");
    if (await copyText(url)) toast(I.t.copied);
  });
}

/* ---------- Share / copy link ---------- */
export function initShare(I) {
  $$("[data-share-native]").forEach((b) => {
    if (!navigator.share) return;
    b.hidden = false;
    b.addEventListener("click", () => navigator.share({ title: b.dataset.title, url: b.dataset.url }).catch(() => {}));
  });
  $$("[data-copy-link]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (await copyText(b.dataset.url || location.href)) toast(I.t.copied);
    })
  );
}

/* ---------- Text size (A− / A+) ---------- */
export function initTextSize() {
  const btns = $$("[data-textsize]");
  if (!btns.length) return;
  const steps = ["sm", "md", "lg", "xl"];
  const root = document.documentElement;
  const cur = () => root.getAttribute("data-textsize") || "md";
  const set = (s) => {
    if (s === "md") root.removeAttribute("data-textsize");
    else root.setAttribute("data-textsize", s);
    store.set("textsize", s === "md" ? null : s);
  };
  btns.forEach((b) =>
    b.addEventListener("click", () => {
      const i = steps.indexOf(cur());
      const a = b.dataset.textsize;
      if (a === "down") set(steps[Math.max(0, i - 1)]);
      else if (a === "up") set(steps[Math.min(steps.length - 1, i + 1)]);
      else set("md");
    })
  );
}

/* ---------- Back to top ---------- */
export function initBackToTop() {
  const b = $("[data-top]");
  if (!b) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    b.classList.toggle("to-top--show", scrollY > 700);
  };
  addEventListener("scroll", () => !ticking && ((ticking = true), requestAnimationFrame(update)), { passive: true });
  b.addEventListener("click", () => scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" }));
  update();
}

/* ---------- Anti-scrape e-mail links ---------- */
export function initEmail() {
  $$("a[data-eu][data-ed]").forEach((a) => {
    try {
      const addr = `${atob(a.dataset.eu)}@${atob(a.dataset.ed)}`;
      a.setAttribute("href", `mailto:${addr}`);
      if (a.hasAttribute("data-eshow")) a.textContent = addr;
    } catch {}
  });
}

/* ---------- Random post ---------- */
export function initRandom() {
  const links = $$("[data-random-post]");
  if (!links.length) return;
  links.forEach((a) =>
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      const { loadIndex } = await import("./search.js");
      const { posts } = await loadIndex();
      const pick = posts[Math.floor(Math.random() * posts.length)];
      location.assign(pick ? pick.u : "/blog/");
    })
  );
}

/* ---------- Offline page: list pages that are available from the cache ---------- */
export async function initOffline(I) {
  const list = $("[data-offline-list]");
  if (!list || !("caches" in window)) return;
  try {
    const names = (await caches.keys()).filter((n) => n.startsWith("pages-"));
    const seen = new Set();
    for (const n of names) {
      for (const req of await (await caches.open(n)).keys()) {
        const u = new URL(req.url);
        if (u.origin !== location.origin || !u.pathname.startsWith("/articles/") || seen.has(u.pathname)) continue;
        seen.add(u.pathname);
        const title = decodeURIComponent(u.pathname.replace(/^\/articles\/|\/$/g, "")).replace(/-/g, " ");
        list.append(el("li", {}, el("a", { href: u.pathname, text: title })));
      }
    }
    if (!seen.size) list.hidden = true;
  } catch {
    list.hidden = true;
  }
  void I;
}

export { fmt };
