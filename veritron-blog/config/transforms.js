import { minify } from "html-minifier-terser";

export function registerTransforms(eleventyConfig, site) {
  if (!site.isProduction) return;
  eleventyConfig.addTransform("htmlmin", async function (content) {
    const out = this.page.outputPath || "";
    if (!out.endsWith(".html")) return content;
    return minify(content, {
      collapseWhitespace: true,
      conservativeCollapse: true, // keep one space between inline elements (important for Bengali runs)
      removeComments: true,
      useShortDoctype: true,
      removeRedundantAttributes: false,
      minifyCSS: false,
      minifyJS: false,
      decodeEntities: false,
    });
  });
}
