import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/thumbnail/youtube": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/playwright-core/browsers.json",
      "./node_modules/youtube-dl-exec/bin/**",
    ],
  },
  reactStrictMode: true,
  // Headers required for FFmpeg.wasm (SharedArrayBuffer support)
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
