import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // AVIF first (about 20% smaller), WebP for browsers without AVIF.
    formats: ["image/avif", "image/webp"],
    // Required allowlist since Next.js 16: 75 for photos, 60 for small thumbnails.
    qualities: [60, 75],
    // Phone, tablet, laptop and desktop widths; 3840 is dropped because no
    // layout shows a product photo wider than ~1400 CSS px.
    deviceSizes: [640, 828, 1080, 1440, 1920, 2560],
    imageSizes: [64, 128, 256, 384],
    // Uploaded photos get a new file name when they change, so optimized
    // variants can be cached for a month.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    localPatterns: [{ pathname: "/images/**", search: "" }],
    remotePatterns: [
      // Supabase Storage public buckets (product photos, sample gallery).
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
