import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['next-dev.vikashkk.com'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img-rsms.b-cdn.net',
      },
      {
        protocol: 'https',
        hostname: 'image-kaamaott.b-cdn.net',
      },
    ],
  },
  reactCompiler: true,
};

export default nextConfig;



 
