import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { BlogPostContent } from "@/components/talents/BlogPostContent";
import { getAllBlogPosts, getBlogPost } from "@/lib/db/repositories/blogs";
import { blogPostHref } from "@/lib/blog";
import { SITE_URL } from "@/lib/site-url";
import type { BlogPost } from "@/lib/db/types";

// Newly published or edited posts show up within a minute
export const revalidate = 60;

type PageProps = { params: Promise<{ id: string }> };

/** Published post by slug or id; drafts are never shown publicly */
async function getPublishedPost(idOrSlug: string): Promise<BlogPost | null> {
  const post = await getBlogPost(idOrSlug);
  return post && post.is_published ? post : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPublishedPost(id);
  if (!post) return { title: "Post not found | VersaTalent" };

  const url = `${SITE_URL}${blogPostHref(post)}`;
  return {
    title: `${post.title} | VersaTalent Blog`,
    description: post.excerpt || undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.excerpt || undefined,
      publishedTime: post.published_at ? new Date(post.published_at).toISOString() : undefined,
      images: post.image_url ? [{ url: post.image_url }] : undefined,
    },
    twitter: {
      card: post.image_url ? "summary_large_image" : "summary",
      title: post.title,
      description: post.excerpt || undefined,
      images: post.image_url ? [post.image_url] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { id } = await params;
  const post = await getPublishedPost(id);

  if (!post) {
    notFound();
  }

  // Up to 3 other posts: same category first, then the most recent
  const others = (await getAllBlogPosts({ publishedOnly: true })).filter((p) => p.id !== post.id);
  const relatedPosts = [
    ...others.filter((p) => post.category && p.category === post.category),
    ...others.filter((p) => !post.category || p.category !== post.category),
  ].slice(0, 3);

  return (
    <MainLayout>
      <BlogPostContent post={post} relatedPosts={relatedPosts} />
    </MainLayout>
  );
}
