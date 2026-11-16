import test from "node:test";
import assert from "node:assert/strict";
import { slugify, readingMinutes, countWords, truncate, extractToc, isExternal, chunk, toPlainText, categorySlug } from "../config/utils.js";

test("slugify keeps Bengali letters and marks (no empty slugs)", () => {
  assert.equal(slugify("প্রতারণা"), "প্রতারণা");
  assert.equal(slugify("অনলাইন নিরাপত্তা"), "অনলাইন-নিরাপত্তা");
  assert.equal(slugify("  Fact Check!  "), "fact-check");
  assert.equal(slugify("a  --  b"), "a-b");
  assert.equal(slugify("12-04-26-aidens-nuclear fusion"), "12-04-26-aidens-nuclear-fusion");
});

test("categorySlug normalises mixed-case front matter", () => {
  assert.equal(categorySlug("Fact-check"), "fact-check");
  assert.equal(categorySlug("NEWS"), "news");
});

test("reading time is at least a minute and counts words", () => {
  assert.equal(readingMinutes("one two three"), 1);
  assert.equal(readingMinutes(Array(401).fill("word").join(" ")), 3);
  assert.equal(countWords("# Title\n\n**bold** [link](http://x.y) text"), 4);
});

test("toPlainText strips markdown and html", () => {
  assert.equal(toPlainText("## Hi\n\n<b>there</b> ![img](a.png) [x](y)"), "Hi there x");
});

test("truncate cuts at a word boundary with an ellipsis", () => {
  const out = truncate("alpha beta gamma delta epsilon", 14);
  assert.ok(out.endsWith("…") && out.length <= 15);
  assert.equal(truncate("short", 50), "short");
});

test("extractToc reads h2/h3 ids and drops the heading anchor", () => {
  const html = '<h2 id="a">One<a class="heading-anchor" href="#a">#</a></h2><h4 id="x">no</h4><h3 id="b">Two</h3>';
  assert.deepEqual(extractToc(html), [{ level: 2, id: "a", text: "One" }, { level: 3, id: "b", text: "Two" }]);
});

test("isExternal", () => {
  assert.equal(isExternal("https://example.org/x", "https://me.test"), true);
  assert.equal(isExternal("https://me.test/x", "https://me.test"), false);
  assert.equal(isExternal("/relative", "https://me.test"), false);
});

test("chunk", () => assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]));
