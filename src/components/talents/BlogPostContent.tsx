import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { ShareButtons } from "@/components/ui/ShareButtons";
import { BlogBody } from "@/components/blog/BlogBody";
import { blogPostHref, formatPostDate, youtubeEmbedUrl } from "@/lib/blog";
import type { BlogPost } from "@/lib/db/types";

interface BlogPostContentProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export function BlogPostContent({ post, relatedPosts }: BlogPostContentProps) {
  const videoEmbed = youtubeEmbedUrl(post.video_url);

  return (
    <article className="bg-white">
      {/* Hero */}
      <div className={`relative w-full ${post.image_url ? "h-[50vh] md:h-[60vh]" : "py-24 md:py-32"} bg-gradient-to-br from-black via-gray-900 to-black`}>
        {post.image_url && (
          <>
            <Image
              src={post.image_url}
              alt={post.title}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
          </>
        )}

        <div className={post.image_url ? "absolute bottom-0 left-0 right-0 p-6 md:p-12" : "relative px-6 md:px-12"}>
          <div className="container mx-auto">
            {post.category && (
              <Badge className="mb-4 bg-gold text-white border-none">
                {post.category}
              </Badge>
            )}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 max-w-4xl">{post.title}</h1>
            <div className="flex items-center text-sm text-gray-200">
              <span>{formatPostDate(post)}</span>
              <span className="mx-2">•</span>
              <span>By {post.author}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {post.excerpt && (
              <p className="text-xl text-gray-800 leading-relaxed mb-8">{post.excerpt}</p>
            )}

            <div className="prose prose-lg max-w-none">
              <BlogBody content={post.content} />
            </div>

            {videoEmbed && (
              <div className="relative mt-8 aspect-video overflow-hidden rounded-lg">
                <iframe
                  src={videoEmbed}
                  title={post.title}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            )}
            {post.video_url && !videoEmbed && (
              <p className="mt-6">
                <a href={post.video_url} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-80 font-medium">
                  Watch the video →
                </a>
              </p>
            )}

            {post.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} className="bg-gold-10 text-gold border border-gold-20 px-3 py-1.5">
                    {tag.replace(/-/g, " ")}
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-10">
              <ShareButtons title={post.title} />
            </div>

            <div className="mt-12">
              <NewsletterForm />
            </div>
          </div>

          {/* Sidebar */}
          <aside>
            {relatedPosts.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">More from the blog</h2>
                <div className="space-y-4">
                  {relatedPosts.map((relatedPost) => (
                    <Link key={relatedPost.id} href={blogPostHref(relatedPost)} className="block">
                      <div className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm">
                        {relatedPost.image_url && (
                          <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden mr-4">
                            <Image
                              src={relatedPost.image_url}
                              alt={relatedPost.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <h3 className="text-foreground font-medium line-clamp-2">{relatedPost.title}</h3>
                          <p className="text-xs text-gray-500 mt-1">{formatPostDate(relatedPost)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Link href="/blog" className="text-gold hover:text-gold-80 font-medium">
              ← All posts
            </Link>
          </aside>
        </div>
      </div>
    </article>
  );
}
