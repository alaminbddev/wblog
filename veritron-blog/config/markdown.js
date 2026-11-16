import markdownItAnchor from "markdown-it-anchor";
import markdownItFootnote from "markdown-it-footnote";
import { slugify, isExternal } from "./utils.js";

export function configureMarkdown(eleventyConfig, site) {
  eleventyConfig.amendLibrary("md", (md) => {
    md.set({ html: true, linkify: true, typographer: false, breaks: false });

    md.use(markdownItAnchor, {
      level: [2, 3, 4],
      slugify,
      permalink: markdownItAnchor.permalink.ariaHidden({
        placement: "after",
        class: "heading-anchor",
        symbol: "#",
        space: false,
      }),
    });
    md.use(markdownItFootnote);

    // --- Hardening & polish at render time (no client-side work, no inline JS/CSS) ---
    const fallback = (tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options);

    const defaultLinkOpen = md.renderer.rules.link_open || fallback;
    md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const href = tokens[idx].attrGet("href") || "";
      if (isExternal(href, site.url)) {
        tokens[idx].attrSet("rel", "noopener noreferrer external");
        tokens[idx].attrSet("data-external", "");
      }
      return defaultLinkOpen(tokens, idx, options, env, self);
    };

    const defaultImage = md.renderer.rules.image || fallback;
    md.renderer.rules.image = (tokens, idx, options, env, self) => {
      tokens[idx].attrSet("loading", "lazy");
      tokens[idx].attrSet("decoding", "async");
      tokens[idx].attrSet("referrerpolicy", "no-referrer");
      if (tokens[idx].attrIndex("data-zoom") < 0) tokens[idx].attrSet("data-zoom", "");
      return defaultImage(tokens, idx, options, env, self);
    };

    // Wide tables scroll inside their own box instead of breaking the layout.
    md.renderer.rules.table_open = () => '<div class="table-wrap"><table>';
    md.renderer.rules.table_close = () => "</table></div>";
  });
}
