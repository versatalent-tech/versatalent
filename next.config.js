/** @type {import('next').NextConfig} */
const nextConfig = {
  // Conditional configuration: use static export for production builds when STATIC_EXPORT=true
  ...(process.env.STATIC_EXPORT === 'true'
    ? {
        output: 'export',
        distDir: 'out'
      }
    : {}
  ),
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'thehanovertheatre.org',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.githubusercontent.com',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
