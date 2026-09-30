import type { BlogPost } from '@/lib/db/types';

/** Public URL of a blog post (slug, falling back to id) */
export function blogPostHref(post: Pick<BlogPost, 'id' | 'slug'>): string {
  return `/blog/${post.slug || post.id}`;
}

/** Date shown on a post: publish date, else creation date */
export function formatPostDate(post: Pick<BlogPost, 'published_at' | 'created_at'>): string {
  const date = post.published_at || post.created_at;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Whether post content is HTML (from a rich editor) rather than plain text */
export function isHtmlContent(content: string): boolean {
  return /<\/?(p|div|h[1-6]|ul|ol|li|br|strong|em|a|img|iframe|blockquote)\b/i.test(content);
}

/** YouTube embed URL for a youtube.com / youtu.be link, or null */
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}
