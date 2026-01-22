import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Increase body size limit for uploads (though we're using signed URLs)
  serverRuntimeConfig: {
    maxDuration: 60,
  },
  // Headers required for FFmpeg.wasm (SharedArrayBuffer support)
  async headers() {
    return [
      {
        source: "/:path*",
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
  // Webpack configuration to handle optional local modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ignore missing optional modules
      config.plugins = config.plugins || [];
      config.plugins.push(
        new (require('webpack').IgnorePlugin)({
          resourceRegExp: /^\.\/local-(storage|queue)$/,
          contextRegExp: /src\/lib$/,
        })
      );
    }
    return config;
  },
};

export default nextConfig;
