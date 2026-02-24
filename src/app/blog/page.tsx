"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { Mail } from "lucide-react";

// Sample blog posts data
const blogPosts = [
  {
    id: "12",
    title: "João Rodolfo Returns with Re-Release of Impactful Album 'Pedofilia'",
    excerpt: "Singer João Rodolfo is back with a bold re-release of his powerful album 'Pedofilia', available August 1st on all platforms.",
    date: "July 4, 2025",
    author: "VersaTalent Team",
    category: "Music",
    image: "/joaorodolfo/Joao_Rodolfo_-_Album_Cover.png",
  },
  {
    id: "11",
    title: "Spotlight on Jessica Dias: From Runway to Content Creation",
    excerpt: "Discover Jessica Dias' journey as a rising model and creator — from Uniquee Fashion Show to the 2025 Graduate Showcase.",
    date: "June 28, 2025",
    author: "VersaTalent Team",
    category: "Modeling",
    image: "/jessicadias/IMG_9412-altered.jpg",
  },
  {
    id: "10",
    title: "Antonio Monteiro: Resilience Beyond the Spot-Kick",
    excerpt: "After Shirebrook Town’s penalty heartbreak, our versatile midfielder reflects on lessons learned and goals for next season.",
    date: "June 6, 2025",
    author: "VersaTalent Team",
    category: "Sports",
    image: "/antoniomonteiro/Tonecas_1.jpg",
  },
  {
    id: "9",
    title: "Jessica Dias: From Uniquee Runway to Graduate Fashion Showcase Star",
    excerpt: "VersaTalent’s rising model discusses her runway wins, creative ambitions, and what’s next after landing a spot in the 2025 Graduate Fashion Comms Showcase.",
    date: "June 6, 2025",
    author: "VersaTalent Team",
    category: "Modeling",
    image: "/jessicadias/IMG_9193-altered.jpg",
  },
  {
    id: "8",
    title: "Deejay WG’s Travel Edition: A Genre-Blending Journey Around the Globe",
    excerpt: "From Afrobeat sunsets to Amapiano nights, explore WG’s new mix series proving no dancefloor is too far.",
    date: "June 6, 2025",
    author: "VersaTalent Team",
    category: "Music",
    image: "/deejaywg/IMG_8999.jpg",
  },
  {
    id: "7",
    title: "João Rodolfo: From Gumbé Roots to Global Goals – Exclusive Interview",
    excerpt: "In an intimate chat, João shares his journey from Guinea-Bissau to the UK, the cultural heartbeat behind his music, and where he hopes it takes him next.",
    date: "June 5, 2025",
    author: "VersaTalent Team",
    category: "Music",
    image: "/joaorodolfo/JROD_2.jpg",
  },
  {
    id: "1",
    title: "Behind the Scenes: Fashion Week with Our Models",
    excerpt: "Go backstage with VersaTalent's models as they navigate the glamorous chaos of New York Fashion Week.",
    date: "April 12, 2025",
    author: "Emma Richards",
    category: "Modeling",
    image: "https://images.unsplash.com/photo-1520228504846-3762f4240df8?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  },
];

export default function BlogPage() {
  return (
    <MainLayout>
      <div className="bg-white py-16 md:py-24">
        <div className="container px-4 mx-auto">
          <motion.div
            className="max-w-3xl mx-auto text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold text-foreground mb-4">
              VersaTalent <span className="text-gold">Blog</span>
            </h1>
            <p className="text-gray-600">
              Insights, stories, and news from our talent and industry experts.
            </p>
          </motion.div>

          {/* Featured Post */}
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link href={`/blog/${blogPosts[0].id}`} className="block">
              <div className="relative rounded-lg overflow-hidden aspect-[16/9] shadow-lg">
                <Image
                  src={blogPosts[0].image}
                  alt={blogPosts[0].title}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6 md:p-8">
                  <Badge className="mb-4 bg-gold text-white border-none">
                    {blogPosts[0].category}
                  </Badge>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {blogPosts[0].title}
                  </h2>
                  <p className="text-gray-200 mb-4 max-w-3xl">
                    {blogPosts[0].excerpt}
                  </p>
                  <div className="flex items-center text-sm text-gray-300">
                    <span>{blogPosts[0].date}</span>
                    <span className="mx-2">•</span>
                    <span>By {blogPosts[0].author}</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Blog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.slice(1).map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
                whileHover={{ y: -5 }}
              >
                <Link href={`/blog/${post.id}`} className="block h-full">
                  <Card className="overflow-hidden bg-white border-gray-200 h-full hover:border-gold hover:shadow-md transition-all duration-300">
                    <div className="relative h-48 w-full">
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <CardContent className="p-6">
                      <div className="mb-3">
                        <Badge variant="outline" className="text-gold border-gold-20">
                          {post.category}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-foreground text-xl mb-2 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <span>{post.date}</span>
                        <span className="mx-2">•</span>
                        <span>By {post.author}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Newsletter Subscription Section */}
          <motion.div
            className="mt-16 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
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
          </motion.div>

          {/* Call to action */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
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
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
