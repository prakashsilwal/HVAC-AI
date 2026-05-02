import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ws and @anthropic-ai/sdk must stay in Node.js — don't bundle for edge/browser
  serverExternalPackages: ["ws", "@anthropic-ai/sdk"],
};

export default nextConfig;
