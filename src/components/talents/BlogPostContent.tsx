"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { ShareButtons } from '@/components/ui/ShareButtons';

type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  authorRole: string;
  authorImage: string;
  category: string;
  image: string;
  relatedPosts?: string[];
};

interface BlogPostContentProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export function BlogPostContent({ post, relatedPosts }: BlogPostContentProps) {
  const [contentSections, setContentSections] = useState<JSX.Element[]>([]);

  useEffect(() => {
    // Process the blog content into paragraphs and headings
    const sections: JSX.Element[] = [];

    if (post.id === "1") {
      // Only process the full content for the first post
      const paragraphs = post.content.split('<p>');

      // Skip the first empty element from split
      for (let i = 1; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];

        if (paragraph.startsWith('<h2>')) {
          // Extract heading and the paragraph after it
          const headingText = paragraph.substring(4, paragraph.indexOf('</h2>'));
          const remaining = paragraph.substring(paragraph.indexOf('</h2>') + 5);

          sections.push(
            <motion.div
              key={`heading-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * i }}
            >
              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4 border-b border-gray-200 pb-2">{headingText}</h2>
              <p className="text-gray-600 mb-4">{remaining.replace('</p>', '')}</p>
            </motion.div>
          );
        } else {
          // Just a regular paragraph
          sections.push(
            <motion.p
              key={`paragraph-${i}`}
              className="text-gray-600 mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
            >
              {paragraph.replace('</p>', '')}
            </motion.p>
          );
        }
      }
    } else {
      // For other posts, render raw HTML (allows divs, iframes, etc.)
      sections.push(
        <motion.div
          key="content"
          className="text-gray-600 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      );
    }

    setContentSections(sections);
  }, [post]);

  return (
    <article className="bg-white">
      {/* Hero Image */}
      <div className="relative w-full h-[50vh] md:h-[60vh]">
        <Image
          src={post.image}
          alt={post.title}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 bg-gold text-white border-none">
                {post.category}
              </Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 max-w-4xl">{post.title}</h1>
              <div className="flex items-center text-sm text-gray-200">
                <span>{post.date}</span>
                <span className="mx-2">•</span>
                <span>By {post.author}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="prose prose-lg max-w-none">
              {/* Render the processed content sections */}
              <div className="blog-content">
                {contentSections}
              </div>
            </div>

            {/* Author Info */}
            <motion.div
              className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center">
                <div className="relative w-16 h-16 rounded-full overflow-hidden mr-4">
                  <Image
                    src={post.authorImage}
                    alt={post.author}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-foreground font-semibold">{post.author}</h3>
                  <p className="text-gray-500 text-sm">{post.authorRole}</p>
                </div>
              </div>
            </motion.div>


            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-xl font-semibold text-foreground mb-4">Related Articles</h2>
                <div className="space-y-4">
                  {relatedPosts.map((relatedPost, index) => (
                    <motion.div
                      key={relatedPost.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 * (index + 1) }}
                    >
                      <Link href={`/blog/${relatedPost.id}`} className="block">
                        <div className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm">
                          <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden mr-4">
                            <Image
                              src={relatedPost.image}
                              alt={relatedPost.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <h3 className="text-foreground font-medium line-clamp-2">{relatedPost.title}</h3>
                            <p className="text-xs text-gray-500 mt-1">{relatedPost.date}</p>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Categories */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h2 className="text-xl font-semibold text-foreground mb-4">Categories</h2>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-gold-10 hover:bg-gold-20 text-gold border border-gold-20 px-3 py-1.5">
                  Acting
                </Badge>
                <Badge className="bg-gold-10 hover:bg-gold-20 text-gold border border-gold-20 px-3 py-1.5">
                  Modeling
                </Badge>
                <Badge className="bg-gold-10 hover:bg-gold-20 text-gold border border-gold-20 px-3 py-1.5">
                  Music
                </Badge>
                <Badge className="bg-gold-10 hover:bg-gold-20 text-gold border border-gold-20 px-3 py-1.5">
                  Culinary
                </Badge>
                <Badge className="bg-gold-10 hover:bg-gold-20 text-gold border border-gold-20 px-3 py-1.5">
                  Sports
                </Badge>
              </div>
            </motion.div>

            {/* Newsletter */}
            <NewsletterForm />
          </div>

          {/* Sidebar */}
          <div>
            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h2 className="text-xl font-semibold text-foreground mb-4">Related Articles</h2>
                <div className="space-y-4">
                  {relatedPosts.map((relatedPost, index) => (
                    <motion.div
                      key={relatedPost.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 * (index + 1) }}
                    >
                      <Link href={`/blog/${relatedPost.id}`} className="block">
                        <div className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm">
                          <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden mr-4">
                            <Image
                              src={relatedPost.image}
                              alt={relatedPost.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <h3 className="text-foreground font-medium line-clamp-2">{relatedPost.title}</h3>
                            <p className="text-xs text-gray-500 mt-1">{relatedPost.date}</p>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

        {/* Share buttons at the bottom */}
        <div className="container mx-auto px-4 mt-12">
          <ShareButtons title={post.title} />
        </div>
    </article>
  );
}
