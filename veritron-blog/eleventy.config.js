import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";

import { loadSite } from "./config/site.js";
import { registerFilters } from "./config/filters.js";
import { registerCollections } from "./config/collections.js";
import { configureMarkdown } from "./config/markdown.js";
import { registerTransforms } from "./config/transforms.js";

const MANIFEST = ".cache/assets-manifest.json";

export default function (eleventyConfig) {
  const site = loadSite();

  // Hashed CSS/JS/fonts are produced by esbuild (scripts/build-assets.mjs). Make plain
  // `npx eleventy` work too by building them on demand.
  const readManifest = () => {
    if (!existsSync(MANIFEST)) {
      execFileSync(process.execPath, ["scripts/build-assets.mjs"], { stdio: "inherit" });
    }
    return JSON.parse(readFileSync(MANIFEST, "utf8"));
  };
  eleventyConfig.addGlobalData("assets", readManifest);
  eleventyConfig.addWatchTarget(MANIFEST);
  eleventyConfig.addWatchTarget("./site.config.json");

  eleventyConfig.addPlugin(syntaxHighlight, { preAttributes: { tabindex: 0 }, trim: true });
  configureMarkdown(eleventyConfig, site);
  registerFilters(eleventyConfig, site);
  registerCollections(eleventyConfig, site);
  registerTransforms(eleventyConfig, site);

  // Static files
  eleventyConfig.addPassthroughCopy({ "src/images": "images" });
  eleventyConfig.addPassthroughCopy({ ".cache/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/images/favicon/favicon.ico": "favicon.ico" });
  eleventyConfig.addPassthroughCopy({ "src/ads.txt": "ads.txt" });

  eleventyConfig.setServerOptions({ showVersion: false, domDiff: true });
  eleventyConfig.setQuietMode(false);

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md", "html", "11ty.js"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
