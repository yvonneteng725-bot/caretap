import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // googleapis is a Node-only package; keep it out of the client bundle.
  serverExternalPackages: ["googleapis"],
};

export default nextConfig;
