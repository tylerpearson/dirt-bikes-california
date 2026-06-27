import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static app (no API routes, middleware, or dynamic rendering), so we
  // export to plain HTML/CSS/JS and serve it from Cloudflare static assets.
  output: "export",
};

export default nextConfig;
