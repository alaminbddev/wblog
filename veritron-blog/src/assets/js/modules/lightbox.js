import { $$, el } from "../lib/dom.js";

export function initLightbox(I) {
  const imgs = $$("[data-post-body] img[data-zoom]");
  if (!imgs.length || typeof HTMLDialogElement === "undefined") return;
  let dialog, big;
  const ensure = () => {
    if (dialog) return;
    big = el("img", { class: "lightbox__img", alt: "" });
    const close = el("button", { type: "button", class: "lightbox__close", "aria-label": I.t.zoomClose, text: "×" });
    dialog = el("dialog", { class: "lightbox", "aria-label": I.t.zoomClose }, big, close);
    close.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => e.target !== big && dialog.close());
    document.body.append(dialog);
  };
  for (const img of imgs) {
    img.setAttribute("tabindex", "0");
    img.setAttribute("role", "button");
    const open = () => {
      ensure();
      big.src = img.currentSrc || img.src;
      big.alt = img.alt || "";
      dialog.showModal();
    };
    img.addEventListener("click", open);
    img.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open()));
  }
}
