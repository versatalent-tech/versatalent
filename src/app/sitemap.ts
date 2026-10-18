import type { MetadataRoute } from 'next';
import { getAllTalents } from '@/lib/db/repositories/talents';
import { getAllEvents } from '@/lib/db/repositories/events';
import { getAllBlogPosts } from '@/lib/db/repositories/blogs';
import { blogPostHref } from '@/lib/blog';
import { SITE_URL } from '@/lib/site-url';

// Regenerate at most once an hour
export const revalidate = 3600;

const STATIC_PAGES: { path: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/talents', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/events', changeFrequency: 'daily', priority: 0.9 },
  { path: '/join', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/for-brands', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/membership', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/membership/terms', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  }));

  // If the database is unreachable, still serve the static pages
  try {
    const talents = await getAllTalents({ activeOnly: true });
    for (const talent of talents) {
      entries.push({
        url: `${SITE_URL}/talents/${talent.id}`,
        lastModified: talent.updated_at,
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error('[sitemap] Failed to load talents:', error);
  }

  try {
    const events = await getAllEvents({ publishedOnly: true });
    for (const event of events) {
      entries.push({
        url: `${SITE_URL}/events/${event.id}`,
        lastModified: event.updated_at,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch (error) {
    console.error('[sitemap] Failed to load events:', error);
  }

  try {
    const posts = await getAllBlogPosts({ publishedOnly: true });
    for (const post of posts) {
      entries.push({
        url: `${SITE_URL}${blogPostHref(post)}`,
        lastModified: post.updated_at,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
  } catch (error) {
    console.error('[sitemap] Failed to load blog posts:', error);
  }

  return entries;
}
