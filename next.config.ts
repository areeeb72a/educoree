import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias["@supabase/supabase-js"] = path.resolve("./lib/supabase-wrapper.ts");
    return config;
  },
  turbopack: {
    resolveAlias: {
      "@supabase/supabase-js": "./lib/supabase-wrapper.ts"
    }
  }
};

export default nextConfig;
