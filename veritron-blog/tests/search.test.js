import test from "node:test";
import assert from "node:assert/strict";
import { normalize, tokenize, prepareIndex, search, highlight, snippet, safeInternalUrl } from "../src/assets/js/lib/search-core.js";

const idx = prepareIndex([
  { t: "ব্রেইন কি সত্যিই ব্যথা অনুভব করে না?", u: "/a/", d: "2026-04-15", c: "স্বাস্থ্য", g: ["Brain", "Pain"], e: "মস্তিষ্ক নিজে ব্যথা অনুভব করে না", b: "মাথাব্যথার আসল কারণ ২০২৬ সালের গবেষণা" },
  { t: "Voyager 1 milestone", u: "/b/", d: "2026-04-14", c: "মহাকাশ", g: ["NASA"], e: "Interstellar space", b: "launched in 1977" },
  { t: "মাইক্রোপ্লাস্টিক ও ডায়াবেটিস", u: "/c/", d: "2026-04-13", c: "স্বাস্থ্য", g: ["Microplastics"], e: "", b: "" },
]);

test("normalize folds Bengali digits, case and zero-width joiners", () => {
  assert.equal(normalize("২০২৬"), "2026");
  assert.equal(normalize("ABC"), "abc");
  assert.equal(normalize("র\u200d্য"), "র্য");
});

test("tokenize splits on punctuation but keeps Bengali words intact", () => {
  assert.deepEqual(tokenize("ব্যথা, অনুভব!"), ["ব্যথা", "অনুভব"]);
});

test("finds Bengali titles", () => {
  const r = search(idx, "ব্রেইন");
  assert.equal(r[0].entry.u, "/a/");
});

test("ASCII digits match Bengali digits in body (and vice-versa)", () => {
  assert.equal(search(idx, "2026")[0].entry.u, "/a/");
  assert.equal(search(idx, "১৯৭৭")[0].entry.u, "/b/");
});

test("all words must match (AND semantics)", () => {
  assert.equal(search(idx, "voyager banana").length, 0);
  assert.equal(search(idx, "voyager 1977").length, 1);
});

test("tags and category contribute to ranking", () => {
  assert.equal(search(idx, "nasa")[0].entry.u, "/b/");
  assert.equal(search(idx, "স্বাস্থ্য").length, 2);
});

test("title matches outrank body-only matches", () => {
  const i2 = prepareIndex([{ t: "Other", u: "/x/", d: "2026-01-01", b: "space space space" }, { t: "Space", u: "/y/", d: "2026-01-01", b: "" }]);
  assert.equal(search(i2, "space")[0].entry.u, "/y/");
});

test("empty / punctuation-only queries return nothing", () => {
  assert.deepEqual(search(idx, "   "), []);
  assert.deepEqual(search(idx, "?!"), []);
});

test("highlight returns safe text segments (never HTML)", () => {
  const segs = highlight("Hello <b>World</b>", ["world"]);
  assert.deepEqual(segs.map((s) => s.text).join(""), "Hello <b>World</b>");
  assert.equal(segs.find((s) => s.hit).text, "World");
});

test("snippet windows around the first hit", () => {
  const text = "x".repeat(300) + " needle " + "y".repeat(300);
  const s = snippet(text, ["needle"], 60);
  assert.ok(s.includes("needle") && s.length < 90 && s.startsWith("…"));
});

test("safeInternalUrl only allows same-origin paths", () => {
  assert.equal(safeInternalUrl("/articles/x/"), "/articles/x/");
  for (const bad of ["//evil.com", "https://evil.com", "javascript:alert(1)", "\\\\evil", "", null, undefined, "/a\nb"]) assert.equal(safeInternalUrl(bad), "");
});
