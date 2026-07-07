import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Required for `output: export` — prerender this route at build time.
export const dynamic = "force-static";

// The site is public: let every crawler reach every page and point them at the
// sitemap. The index/follow meta tag (app/layout.tsx) is the matching signal.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
