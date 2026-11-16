import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import t from "../src/_data/t.js";

const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

test("every t.<key> used in templates exists in the dictionary", () => {
  const dict = t();
  const missing = new Set();
  for (const f of walk("src").filter((f) => /\.(njk|md)$/.test(f))) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/(?<![\w./])t\.([a-zA-Z]+)\b/g)) if (!(m[1] in dict)) missing.add(`${f}: t.${m[1]}`);
  }
  assert.deepEqual([...missing], []);
});

test("English and Bengali dictionaries have identical keys", async () => {
  const src = readFileSync("src/_data/t.js", "utf8");
  const keys = (lang) => {
    const block = src.split(new RegExp(`\\n  ${lang}: \\{`))[1].split(/\n  \},?\n/)[0];
    return [...block.matchAll(/(?:^|[\s,{])([a-zA-Z]+):\s*["`]/g)].map((m) => m[1]).sort();
  };
  assert.deepEqual(keys("bn"), keys("en"));
});

test("client JS only asks for strings that the server sends", () => {
  const clientKeys = [...readFileSync("src/_data/client.js", "utf8").match(/const KEYS = \[([\s\S]*?)\];/)[1].matchAll(/"(\w+)"/g)].map((m) => m[1]);
  const used = new Set();
  for (const f of walk("src/assets/js")) for (const m of readFileSync(f, "utf8").matchAll(/I\.t\.(\w+)/g)) used.add(m[1]);
  const missing = [...used].filter((k) => !clientKeys.includes(k));
  assert.deepEqual(missing, []);
});
