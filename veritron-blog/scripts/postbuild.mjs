import { execFileSync } from "node:child_process";
execFileSync(process.execPath, ["scripts/generate-headers.mjs"], { stdio: "inherit" });
