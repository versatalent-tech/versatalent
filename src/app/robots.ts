import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Internal tools, per-member pages and post-submit screens
      disallow: ['/admin', '/staff', '/api/', '/nfc/', '/vip/', '/dashboard', '/success'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
