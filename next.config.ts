import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Increase body size limit for uploads (though we're using signed URLs)
  serverRuntimeConfig: {
    maxDuration: 60,
  },
};

export default nextConfig;
