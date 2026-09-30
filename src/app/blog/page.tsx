import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/MainLayout";
import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { Mail } from "lucide-react";
import { getAllBlogPosts } from "@/lib/db/repositories/blogs";
import { blogPostHref, formatPostDate } from "@/lib/blog";
import type { BlogPost } from "@/lib/db/types";

// Newly published posts show up within a minute
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog | VersaTalent",
  description: "Insights, stories, and news from VersaTalent and our talent.",
};

async function getPublishedPosts(): Promise<BlogPost[]> {
  try {
    const posts = await getAllBlogPosts({ publishedOnly: true });
    // Featured posts first, then newest
    return [...posts.filter((p) => p.featured), ...posts.filter((p) => !p.featured)];
  } catch (error) {
    console.error("[blog] Failed to load posts:", error);
    return [];
  }
}

export default async function BlogPage() {
  const blogPosts = await getPublishedPosts();
  const [featuredPost, ...otherPosts] = blogPosts;

  return (
    <MainLayout>
      <div className="bg-white py-16 md:py-24">
        <div className="container px-4 mx-auto">
          <div
            className="max-w-3xl mx-auto text-center mb-12"
          >
            <h1 className="text-4xl font-bold text-foreground mb-4">
              VersaTalent <span className="text-gold">Blog</span>
            </h1>
            <p className="text-gray-600">
              Insights, stories, and news from our talent and industry experts.
            </p>
          </div>

          {!featuredPost && (
            <p className="text-center text-gray-600 mb-16">
              New posts are on their way. Subscribe below to hear when they&apos;re published.
            </p>
          )}

          {/* Featured Post */}
          {featuredPost && (
            <div className="mb-16">
              <Link href={blogPostHref(featuredPost)} className="block">
                <div className="relative rounded-lg overflow-hidden aspect-[16/9] shadow-lg bg-gradient-to-br from-black via-gray-900 to-black">
                  {featuredPost.image_url && (
                    <Image
                      src={featuredPost.image_url}
                      alt={featuredPost.title}
                      fill
                      priority
                      className="object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                    {featuredPost.category && (
                      <Badge className="mb-3 bg-gold text-white border-none">{featuredPost.category}</Badge>
                    )}
                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">{featuredPost.title}</h2>
                    {featuredPost.excerpt && (
                      <p className="text-gray-200 mb-4 max-w-3xl line-clamp-3">{featuredPost.excerpt}</p>
                    )}
                    <div className="flex items-center text-sm text-gray-300">
                      <span>{formatPostDate(featuredPost)}</span>
                      <span className="mx-2">•</span>
                      <span>By {featuredPost.author}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Blog Grid */}
          {otherPosts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {otherPosts.map((post) => (
                <Link key={post.id} href={blogPostHref(post)} className="block h-full">
                  <Card className="overflow-hidden bg-white border-gray-200 h-full hover:border-gold hover:shadow-md transition-all duration-300">
                    <div className="relative h-48 w-full bg-gradient-to-br from-black via-gray-900 to-black">
                      {post.image_url && (
                        <Image
                          src={post.image_url}
                          alt={post.title}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <CardContent className="p-6">
                      {post.category && (
                        <div className="mb-3">
                          <Badge variant="outline" className="text-gold border-gold-20">
                            {post.category}
                          </Badge>
                        </div>
                      )}
                      <h3 className="font-bold text-foreground text-xl mb-2 line-clamp-2">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center text-xs text-gray-500">
                        <span>{formatPostDate(post)}</span>
                        <span className="mx-2">•</span>
                        <span>By {post.author}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Newsletter Subscription Section */}
          <div
            className="mt-16 mb-8"
          >
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl p-8 md:p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/20 text-gold mb-6">
                  <Mail className="h-8 w-8" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  Stay in the <span className="text-gold">Loop</span>
                </h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">
                  Get the latest news, exclusive interviews, and behind-the-scenes content delivered straight to your inbox.
                </p>
                <div className="max-w-md mx-auto">
                  <NewsletterForm
                    title=""
                    description=""
                    buttonText="Subscribe Now"
                    source="blog_page"
                    className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Call to action */}
          <div
            className="mt-8 text-center"
          >
            <p className="text-gray-600 mb-2">Have a story to share?</p>
            <Link
              href="/contact"
              className="text-gold hover:text-gold-80 font-medium inline-flex items-center"
            >
              Get in touch with us
              <svg className="ml-2 h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14m-7-7l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
