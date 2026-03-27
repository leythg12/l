import type { NextConfig } from "next";

// For GitHub Pages: set NEXT_PUBLIC_BASE_PATH to your repo name, e.g. "/candy-shop"
// Leave empty for a custom domain or user pages site (username.github.io)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",      // Static HTML export — required for GitHub Pages
  basePath,
  assetPrefix: basePath,
  images: {
    unoptimized: true,   // Required for static export (no Image Optimization API)
  },
  trailingSlash: true,   // GitHub Pages expects index.html in each directory
};

export default nextConfig;
