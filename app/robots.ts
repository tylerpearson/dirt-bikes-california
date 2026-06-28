import type { MetadataRoute } from "next";

// Required for `output: export` — prerender this route at build time.
export const dynamic = "force-static";

// The site is intentionally kept out of search engines: disallow all crawling
// and don't advertise a sitemap. The noindex meta tag (app/layout.tsx) is what
// actually keeps pages out of the index; this is the belt-and-suspenders.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
