import type { NextConfig } from "next";

const supabaseHost =
  process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    : undefined;

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost ?? "*.supabase.co",
      },
    ],
  },
  transpilePackages: ["@supabase/supabase-js", "@supabase/ssr"],
};

export default nextConfig;
