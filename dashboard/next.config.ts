import type { NextConfig } from "next";
import path from "path";

const sharedPath = path.resolve(__dirname, "../src");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
  turbopack: {
    resolveAlias: {
      "@shared": sharedPath,
    },
  },
  webpack: (config) => {
    config.resolve.alias["@shared"] = sharedPath;
    // Allow .js imports in shared src/ to resolve to .ts files
    config.resolve.extensionAlias = {
      ".js": [".ts", ".js"],
    };
    return config;
  },
};

export default nextConfig;
