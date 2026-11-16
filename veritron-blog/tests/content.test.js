import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import matter from "gray-matter";

const dir = "src/articles";
const posts = readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => ({ f, ...matter(readFileSync(`${dir}/${f}`, "utf8")) }));

test("every post has title, date and category", () => {
  for (const p of posts) {
    assert.ok(p.data.title, `${p.f}: title`);
    assert.ok(p.data.date, `${p.f}: date`);
    assert.ok(p.data.category, `${p.f}: category`);
    assert.ok(!Number.isNaN(new Date(p.data.date).getTime()), `${p.f}: valid date`);
  }
});

test("post descriptions are present (SEO + cards)", () => {
  for (const p of posts) assert.ok(String(p.data.excerpt || p.data.subtitle || "").length >= 30, `${p.f}: excerpt too short`);
});

test("remote images are https only", () => {
  for (const p of posts) if (p.data.image) assert.ok(/^(https:\/\/|\/)/.test(p.data.image), `${p.f}: image must be https or site-relative`);
});

test("no raw script/iframe/inline-style in post bodies", () => {
  for (const p of posts) assert.doesNotMatch(p.content, /<(script|iframe|style)\b|\sstyle=|\son\w+=/i, p.f);
});
