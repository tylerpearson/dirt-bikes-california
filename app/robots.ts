import type { MetadataRoute } from "next";

// Required for `output: export` — prerender this route at build time.
export const dynamic = "force-static";

// The site is hidden from search engines by the noindex, nofollow meta tag in
// app/layout.tsx, not by this file. Crawling stays allowed on purpose: a
// crawler that is blocked by `Disallow: /` never fetches the page, never sees
// the noindex tag, and can keep an already-indexed URL in its results. No
// sitemap is advertised here; app/sitemap.ts still builds /sitemap.xml so it
// can be submitted by hand to speed up recrawling, and for when the site goes
// public again.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
  };
}
