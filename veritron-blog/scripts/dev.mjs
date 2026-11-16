// Dev server: esbuild in watch mode + Eleventy --serve (drafts and future posts are visible).
import { spawn } from "node:child_process";
const env = { ...process.env, ELEVENTY_ENV: "development" };
const procs = [
  spawn(process.execPath, ["scripts/build-assets.mjs", "--watch"], { stdio: "inherit", env }),
  spawn(process.execPath, ["node_modules/@11ty/eleventy/cmd.cjs", "--serve", "--quiet"], { stdio: "inherit", env }),
];
const stop = () => procs.forEach((p) => p.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
procs.forEach((p) => p.on("exit", (c) => { stop(); process.exit(c ?? 0); }));
