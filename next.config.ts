import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer, webpack: wp }) => {
    if (!isServer) {
      // pptxgenjs usa node:fs, node:https etc — strip o prefixo no bundle do browser
      config.plugins.push(
        new wp.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        http: false,
        net: false,
        tls: false,
        path: false,
        stream: false,
        zlib: false,
        crypto: false,
        buffer: false,
        url: false,
        util: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;
