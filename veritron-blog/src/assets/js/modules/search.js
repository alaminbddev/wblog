import { $, $$, el, fmt } from "../lib/dom.js";
import { prepareIndex, search, highlight, snippet, safeInternalUrl, normalize } from "../lib/search-core.js";

let data = null;
let pending = null;

/** Fetches /search.json once. Resolves { posts (prepared), tags }. */
export function loadIndex() {
  if (data) return Promise.resolve(data);
  pending ||= fetch("/search.json", { credentials: "same-origin" })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((j) => (data = { posts: prepareIndex(j.posts || []), tags: j.tags || [] }));
  return pending;
}

export function initSearch(I) {
  const dialog = $("[data-search-dialog]");
  if (!dialog || typeof dialog.showModal !== "function") return;
  const input = $("[data-search-input]", dialog);
  const list = $("[data-search-results]", dialog);
  const status = $("[data-search-status]", dialog);
  const nf = new Intl.NumberFormat(I.locale);
  const dateFmt = new Intl.DateTimeFormat(I.locale, { year: "numeric", month: "short", day: "numeric", timeZone: I.timezone });

  let items = []; // rendered <li> options
  let active = -1;
  let loadError = false;

  const setActive = (i) => {
    items.forEach((li, n) => li.setAttribute("aria-selected", String(n === i)));
    active = i;
    const li = items[i];
    if (li) {
      input.setAttribute("aria-activedescendant", li.id);
      li.scrollIntoView({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  };

  const mark = (text, tokens) => highlight(text, tokens).map((s) => (s.hit ? el("mark", { text: s.text }) : s.text));

  const row = (i, { href, title, meta, text, tokens = [], kind = "post" }) => {
    const li = el(
      "li",
      { id: `sr-${i}`, role: "option", class: `search__item search__item--${kind}`, "aria-selected": "false" },
      el(
        "a",
        { href, class: "search__link" },
        el("span", { class: "search__title" }, mark(title, tokens)),
        meta ? el("span", { class: "search__meta", text: meta }) : null,
        text ? el("span", { class: "search__snippet" }, mark(text, tokens)) : null
      )
    );
    li.addEventListener("mousemove", () => active !== i && setActive(i));
    return li;
  };

  const metaFor = (e) => [e.c, e.d ? dateFmt.format(new Date(e.d)) : ""].filter(Boolean).join(" · ");

  const show = (nodes, statusText = "") => {
    list.replaceChildren(...nodes);
    items = nodes.filter((n) => n.getAttribute?.("role") === "option");
    status.textContent = statusText;
    setActive(items.length ? 0 : -1);
  };

  const heading = (text) => el("li", { class: "search__heading", role: "presentation", text });

  const renderDefault = ({ posts, tags }) => {
    const nodes = [heading(I.t.searchRecent)];
    let i = 0;
    for (const p of posts.slice(0, 5)) nodes.push(row(i++, { href: safeInternalUrl(p.u), title: p.t, meta: metaFor(p) }));
    if (tags.length) {
      nodes.push(heading(I.t.searchTopics));
      for (const t of tags.slice(0, 6)) nodes.push(row(i++, { href: safeInternalUrl(t.u), title: `# ${t.n}`, meta: fmt(I.t.postCount, { n: nf.format(t.c) }), kind: "tag" }));
    }
    show(nodes);
  };

  const run = async () => {
    const q = input.value.trim();
    try {
      status.textContent = I.t.searchLoading;
      const idx = await loadIndex();
      loadError = false;
      if (!q) return renderDefault(idx);
      const hits = search(idx.posts, q, { limit: 10 });
      const nq = normalize(q);
      const tagHits = idx.tags.filter((t) => normalize(t.n).includes(nq)).slice(0, 3);
      if (!hits.length && !tagHits.length) {
        return show([el("li", { class: "search__empty", role: "presentation", text: fmt(I.t.searchNone, { q }) })], fmt(I.t.searchNone, { q }));
      }
      const nodes = [];
      let i = 0;
      for (const t of tagHits) nodes.push(row(i++, { href: safeInternalUrl(t.u), title: `# ${t.n}`, meta: fmt(I.t.postCount, { n: nf.format(t.c) }), kind: "tag" }));
      for (const h of hits) {
        const e = h.entry;
        nodes.push(row(i++, { href: safeInternalUrl(e.u), title: e.t, meta: metaFor(e), text: snippet(e.b || e.e || "", h.tokens), tokens: h.tokens }));
      }
      show(nodes, fmt(I.t.searchCount, { n: nf.format(hits.length + tagHits.length) }));
    } catch {
      loadError = true;
      show([el("li", { class: "search__empty", role: "presentation", text: I.t.searchError })], I.t.searchError);
    }
  };

  const open = () => {
    if (dialog.open) return;
    dialog.showModal();
    input.value = "";
    input.focus();
    run();
  };
  const close = () => dialog.open && dialog.close();

  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(run, 60);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") (e.preventDefault(), items.length && setActive((active + 1) % items.length));
    else if (e.key === "ArrowUp") (e.preventDefault(), items.length && setActive((active - 1 + items.length) % items.length));
    else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      $("a", items[active])?.click();
    }
  });
  dialog.addEventListener("click", (e) => e.target === dialog && close()); // backdrop
  $$("[data-search-close]", dialog).forEach((b) => b.addEventListener("click", close));
  dialog.addEventListener("close", () => (loadError = false));

  $$("[data-search-open]").forEach((b) => b.addEventListener("click", open));
  document.addEventListener("keydown", (e) => {
    const typing = /^(input|textarea|select)$/i.test(e.target?.tagName || "") || e.target?.isContentEditable;
    if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) (e.preventDefault(), dialog.open ? close() : open());
    else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) (e.preventDefault(), open());
  });

  // Warm the index when the user shows intent (hover/focus on the search button).
  $$("[data-search-open]").forEach((b) => {
    const warm = () => loadIndex().catch(() => {});
    b.addEventListener("pointerenter", warm, { once: true });
    b.addEventListener("focus", warm, { once: true });
  });
}
