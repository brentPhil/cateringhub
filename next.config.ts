import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@supabase/supabase-js",
    "@supabase/ssr",
  ],
};

export default nextConfig;
