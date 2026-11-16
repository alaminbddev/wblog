export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Create an element; children may be strings (always inserted as text) or nodes. */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** localStorage that never throws (private mode, blocked storage, quota). */
export const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : v;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  json(key, fallback) {
    try {
      const v = JSON.parse(store.get(key, "null"));
      return v ?? fallback;
    } catch {
      return fallback;
    }
  },
};

let toastTimer;
export function toast(message) {
  let box = $("#toast");
  if (!box) {
    box = el("div", { id: "toast", class: "toast", role: "status", "aria-live": "polite" });
    document.body.append(box);
  }
  box.textContent = message;
  box.classList.add("toast--show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove("toast--show"), 2200);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = el("textarea", { "aria-hidden": "true", tabindex: "-1" });
    ta.value = text;
    ta.className = "sr-only";
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    ta.remove();
    return ok;
  }
}

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const fmt = (s = "", vars = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
