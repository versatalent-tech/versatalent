"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle, ExternalLink, RefreshCw, Instagram, AlertCircle } from "lucide-react";
import { useInstagramFeed } from "@/lib/hooks/useInstagramFeed";
import { ARTIST_INSTAGRAM_ACCOUNTS } from "@/lib/services/instagram-service";

interface DynamicInstagramFeedProps {
  className?: string;
}

export function DynamicInstagramFeed({ className = "" }: DynamicInstagramFeedProps) {
  const {
    posts,
    loading,
    error,
    lastUpdated,
    refreshPosts,
    formatRelativeTime,
    formatNumber,
    getArtistConfig
  } = useInstagramFeed({
    postsPerArtist: 1,
    autoRefresh: true,
    refreshInterval: 15 * 60 * 1000 // 15 minutes
  });

  // Convert posts object to array for easier rendering
  const postEntries = Object.entries(posts).filter(([_, posts]) => posts.length > 0);

  if (loading && postEntries.length === 0) {
    return (
      <section className={`py-16 bg-white ${className}`}>
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Follow Our <span className="text-gold">Artists</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
              Loading latest posts from our talented artists...
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error && postEntries.length === 0) {
    return (
      <section className={`py-16 bg-white ${className}`}>
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Follow Our <span className="text-gold">Artists</span>
            </h2>
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
                <AlertCircle className="h-5 w-5" />
                <span>Unable to load Instagram posts</span>
              </div>
              <button
                onClick={refreshPosts}
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-16 bg-white ${className}`}>
      <div className="container px-4 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Follow Our <span className="text-gold">Artists</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            Stay connected with our talent and see their latest projects and achievements
          </p>
          <div className="flex items-center justify-center gap-4 text-gray-500">
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4" />
              <span className="text-sm">Latest from Instagram</span>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-2">
                <span className="text-xs">Updated {formatRelativeTime(lastUpdated.toISOString())}</span>
                <button
                  onClick={refreshPosts}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Refresh posts"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {postEntries.map(([artistKey, artistPosts], index) => {
            const config = getArtistConfig(artistKey);
            const post = artistPosts[0]; // Get the latest post

            if (!config || !post) return null;

            return (
              <motion.div
                key={artistKey}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -2 }}
              >
                {/* Post Header */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    <img
                      src={config.profile_picture}
                      alt={config.display_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground">
                      {config.display_name}
                    </h3>
                    <p className="text-xs text-gray-500">@{config.username}</p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatRelativeTime(post.timestamp)}
                  </div>
                </div>

                {/* Post Image */}
                <div className="relative aspect-square overflow-hidden group">
                  <img
                    src={post.media_url}
                    alt={`${config.display_name} post`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      whileHover={{ scale: 1 }}
                      className="flex items-center gap-4 text-white"
                    >
                      {post.like_count && (
                        <div className="flex items-center gap-1">
                          <Heart className="h-5 w-5" />
                          <span className="text-sm font-semibold">
                            {formatNumber(post.like_count)}
                          </span>
                        </div>
                      )}
                      {post.comments_count && (
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-5 w-5" />
                          <span className="text-sm font-semibold">
                            {formatNumber(post.comments_count)}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>

                {/* Post Content */}
                <div className="p-4">
                  <div className="flex items-center gap-4 mb-3">
                    {post.like_count && (
                      <div className="flex items-center gap-1 text-gray-700">
                        <Heart className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {formatNumber(post.like_count)}
                        </span>
                      </div>
                    )}
                    {post.comments_count && (
                      <div className="flex items-center gap-1 text-gray-700">
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {formatNumber(post.comments_count)}
                        </span>
                      </div>
                    )}
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-gold hover:text-gold/80 transition-colors ml-auto"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>

                  {/* Post Caption */}
                  <div className="text-sm text-gray-800 leading-relaxed">
                    <span className="font-semibold">{config.display_name}</span>{' '}
                    <span className="line-clamp-3">{post.caption}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Follow CTA */}
        <div className="text-center mt-12">
          <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-lg p-8 max-w-2xl mx-auto text-white">
            <Instagram className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-3">Follow Our Artists</h3>
            <p className="text-lg opacity-90 mb-6">
              Stay updated with their latest projects, achievements, and behind-the-scenes content
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {Object.entries(ARTIST_INSTAGRAM_ACCOUNTS).map(([key, config]) => (
                <a
                  key={key}
                  href={config.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/30 transition-all cursor-pointer"
                >
                  @{config.username}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
