/** @type {import('next').NextConfig} */
const nextConfig = {
  // Conditional configuration: use static export for production builds when STATIC_EXPORT=true
  ...(process.env.STATIC_EXPORT === 'true'
    ? {
        output: 'export',
        distDir: 'out'
      }
    : {
        // The end-to-end tests build into their own folder (scripts/e2e.mjs)
        ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
        // The old till page was removed; send bookmarks to the staff till
        async redirects() {
          return [{ source: '/pos', destination: '/staff/pos', permanent: true }];
        },
      }
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
};

module.exports = nextConfig;
