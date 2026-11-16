// Runs before first paint (blocking, ~250 bytes): applies the saved theme & text size
// so there is no flash of the wrong theme. Also marks the page as JS-capable.
(function () {
  var d = document.documentElement;
  d.classList.add("js");
  try {
    var t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") d.setAttribute("data-theme", t);
    d.setAttribute("data-theme-pref", t === "light" || t === "dark" ? t : "auto");
    var s = localStorage.getItem("textsize");
    if (s === "sm" || s === "lg" || s === "xl") d.setAttribute("data-textsize", s);
  } catch (e) {
    d.setAttribute("data-theme-pref", "auto");
  }
})();
