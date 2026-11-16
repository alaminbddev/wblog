// Production build: assets → Eleventy → headers. Cross-platform (no shell env syntax).
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const env = { ...process.env, ELEVENTY_ENV: "production", NODE_ENV: "production" };
const run = (args) => {
  const r = spawnSync(process.execPath, args, { stdio: "inherit", env });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
rmSync("_site", { recursive: true, force: true });
run(["scripts/build-assets.mjs"]);
run(["node_modules/@11ty/eleventy/cmd.cjs"]);
run(["scripts/postbuild.mjs"]);
