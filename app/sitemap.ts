import type { MetadataRoute } from "next";
import { AREAS } from "@/lib/areas";
import { SITE_URL } from "@/lib/seo";

// Required for `output: export` — prerender this route at build time.
export const dynamic = "force-static";

/** Static sitemap: the home map page plus one page per riding area. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...AREAS.map((area) => ({
      url: `${SITE_URL}/${area.id}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
