import { ImageResponse } from "next/og";
import { AREAS } from "@/lib/areas";

export const alt = "SoCal Dirt Bike & OHV Routes — Field Guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Required for `output: export` — prerender this image at build time.
export const dynamic = "force-static";

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
          fontFamily: "sans-serif",
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
              fontSize: 110,
              fontWeight: 700,
              lineHeight: 1,
              textTransform: "uppercase",
              letterSpacing: -2,
            }}
          >
            Dirt Bike Routes
          </div>
          <div style={{ display: "flex", fontSize: 34, marginTop: 28, color: "#5c5230" }}>
            {AREAS.length} riding areas · {routeCount} curated routes · real MVUM maps
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
    { ...size },
  );
}
