import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { AREAS } from "@/lib/areas";

export const alt = "SoCal Dirt Bike & OHV Routes · Field Guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Required for `output: export` — prerender this image at build time.
export const dynamic = "force-static";

// The site's own typefaces (Zilla Slab display + Archivo body), vendored as
// static TTFs so the share card matches the live site instead of falling back
// to a generic sans. Satori can't read next/font's woff2, hence the local TTFs.
const fontFile = (name: string) =>
  readFileSync(path.join(process.cwd(), "app", "_og-fonts", name));

/** Default share card for every page, generated at build time. */
export default function Image() {
  const routeCount = AREAS.reduce((n, a) => n + a.routes.length, 0);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          backgroundColor: "#efe7d4",
          color: "#3c2d14",
          fontFamily: "Archivo",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#8a5a2b",
            fontWeight: 600,
          }}
        >
          Field Guide · Southern California
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Zilla Slab",
              fontSize: 120,
              fontWeight: 700,
              lineHeight: 1,
              textTransform: "uppercase",
              letterSpacing: -3,
            }}
          >
            Dirt Bike Routes
          </div>
          <div style={{ display: "flex", fontSize: 34, marginTop: 28, color: "#5c5230" }}>
            {AREAS.length} riding areas · {routeCount} curated routes · real Forest Service maps
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#5c5230",
            borderTop: "3px solid #3c2d14",
            paddingTop: 24,
          }}
        >
          dirtbikes.typearson.dev
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Zilla Slab", data: fontFile("ZillaSlab-Bold.ttf"), weight: 700, style: "normal" },
        { name: "Archivo", data: fontFile("Archivo-SemiBold.ttf"), weight: 600, style: "normal" },
        { name: "Archivo", data: fontFile("Archivo-Regular.ttf"), weight: 400, style: "normal" },
      ],
    },
  );
}
