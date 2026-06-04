import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  transpilePackages: ["@streamfusion/shared", "@streamfusion/chat-core"],
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
