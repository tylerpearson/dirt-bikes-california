import type { MetadataRoute } from "next";
import { AREAS } from "@/lib/areas";
import { SITE_URL } from "@/lib/seo";

// Required for `output: export` — prerender this route at build time.
export const dynamic = "force-static";

// One entry per statically-exported page: the home page plus every area guide.
// Route detail lives on the area pages themselves, so there are no deeper URLs
// to list. Adding an area to lib/areas.ts adds it here automatically.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    ...AREAS.map((area) => ({
      url: `${SITE_URL}/${area.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
