import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@supabase/supabase-js",
    "@supabase/ssr",
    "@supabase/auth-ui-react",
    "@supabase/auth-ui-shared",
    "@supabase-cache-helpers/postgrest-react-query",
  ],
};

export default nextConfig;
