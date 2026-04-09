/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.storage.supabase.io',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2gb',
    },
  },
};

module.exports = nextConfig;
