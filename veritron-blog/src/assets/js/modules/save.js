import { $, $$, el, store, toast } from "../lib/dom.js";
import { safeInternalUrl } from "../lib/search-core.js";

const KEY = "saved-posts";
const read = () => {
  const v = store.json(KEY, []);
  return Array.isArray(v) ? v.filter((x) => x && safeInternalUrl(x.u) && typeof x.t === "string").slice(0, 200) : [];
};
const write = (list) => store.set(KEY, JSON.stringify(list));

function paintCount() {
  const n = read().length;
  $$("[data-saved-count]").forEach((b) => {
    b.textContent = n ? String(n) : "";
    b.hidden = !n;
  });
}

export function initSave(I) {
  paintCount();

  // "Read later" buttons on posts
  $$("[data-save]").forEach((btn) => {
    const url = btn.dataset.url;
    const label = $("[data-save-label]", btn);
    const paint = () => {
      const on = read().some((x) => x.u === url);
      btn.setAttribute("aria-pressed", String(on));
      if (label) label.textContent = on ? I.t.unsave : I.t.save;
    };
    paint();
    btn.addEventListener("click", () => {
      let list = read();
      if (list.some((x) => x.u === url)) list = list.filter((x) => x.u !== url);
      else list.unshift({ u: url, t: btn.dataset.title, s: Date.now() });
      write(list);
      paint();
      paintCount();
      toast(btn.getAttribute("aria-pressed") === "true" ? I.t.saved : I.t.unsave);
    });
  });

  // /saved/ page
  const mount = $("[data-saved-list]");
  if (!mount) return;
  const render = () => {
    const list = read();
    mount.replaceChildren();
    const empty = $("[data-saved-empty]");
    const clear = $("[data-saved-clear]");
    if (empty) empty.hidden = list.length > 0;
    if (clear) clear.hidden = list.length === 0;
    for (const x of list) {
      const rm = el("button", { type: "button", class: "link-btn", text: "×", "aria-label": `${I.t.unsave}: ${x.t}` });
      rm.addEventListener("click", () => {
        write(read().filter((y) => y.u !== x.u));
        paintCount();
        render();
      });
      mount.append(el("li", { class: "saved-item" }, el("a", { href: x.u, text: x.t }), rm));
    }
  };
  $("[data-saved-clear]")?.addEventListener("click", () => {
    write([]);
    paintCount();
    render();
  });
  render();
}
