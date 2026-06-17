import type { NextConfig } from "next";

// Allow Next.js server-side fetch to connect to the devos-agent which uses
// a self-signed certificate (local.wakeup.com:3131). Only applied in dev.
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const nextConfig: NextConfig = {
  output: 'standalone'
};

export default nextConfig;
