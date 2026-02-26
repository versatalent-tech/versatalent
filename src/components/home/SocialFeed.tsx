"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, MessageCircle, Share, ExternalLink, Instagram } from "lucide-react";

interface SocialPost {
  id: string;
  artistId: string;
  artistName: string;
  artistHandle: string;
  artistAvatar: string;
  image: string;
  caption: string;
  likes: number;
  comments: number;
  timeAgo: string;
  isVideo?: boolean;
}

const socialPosts: SocialPost[] = [
  {
    id: '1',
    artistId: '1',
    artistName: 'Deejay WG',
    artistHandle: '@deejaywg',
    artistAvatar: '/deejaywg/IMG_8999.jpg',
    image: '/deejaywg/IMG_8976.jpg',
    caption: 'Studio vibes tonight 🎵 Working on something special for you all! The energy is unmatched when the music flows. #MusicProducer #StudioLife #NewMusic',
    likes: 1247,
    comments: 89,
    timeAgo: '2 hours ago'
  },
  {
    id: '2',
    artistId: '2',
    artistName: 'Jessica Dias',
    artistHandle: '@jessicadias',
    artistAvatar: '/jessicadias/IMG_9288-altered.jpg',
    image: '/jessicadias/IMG_9214-altered.jpg',
    caption: 'Behind the scenes of today\'s fashion shoot ✨ Grateful for amazing teams that bring visions to life. This collection speaks to my soul! #BehindTheScenes #FashionShoot #Grateful',
    likes: 2156,
    comments: 143,
    timeAgo: '5 hours ago'
  },
  {
    id: '3',
    artistId: '3',
    artistName: 'João Rodolfo',
    artistHandle: '@joaorodolfo',
    artistAvatar: '/joaorodolfo/billboard.PNG',
    image: '/joaorodolfo/camera.PNG',
    caption: 'Rehearsing for the cultural night performance 🇬🇼 Bringing the sounds of Guiné-Bissau to Leeds! Music connects us all across borders. #GuinéBissau #CulturalNight #WorldMusic',
    likes: 892,
    comments: 67,
    timeAgo: '1 day ago'
  },
  {
    id: '4',
    artistId: '4',
    artistName: 'Antonio Monteiro',
    artistHandle: '@antoniomonteiro',
    artistAvatar: '/antoniomonteiro/Tonecas_1.jpg',
    image: '/antoniomonteiro/Tonecas_3.jpg',
    caption: 'Match day preparation 💪 Every training session gets me closer to the goal. Dedication pays off when it matters most. #MatchDay #Football #DedicationPaysOff',
    likes: 1534,
    comments: 98,
    timeAgo: '1 day ago'
  },
  {
    id: '5',
    artistId: '1',
    artistName: 'Deejay WG',
    artistHandle: '@deejaywg',
    artistAvatar: '/deejaywg/IMG_8999.jpg',
    image: '/deejaywg/IMG_8987.jpg',
    caption: 'Equipment check before tonight\'s gig 🎧 The connection between artist and audience starts with perfect sound. Ready to make some magic! #DJ #LivePerformance #MusicIsLife',
    likes: 967,
    comments: 54,
    timeAgo: '2 days ago'
  },
  {
    id: '6',
    artistId: '2',
    artistName: 'Jessica Dias',
    artistHandle: '@jessicadias',
    artistAvatar: '/jessicadias/IMG_9288-altered.jpg',
    image: '/jessicadias/IMG_9365-altered.jpg',
    caption: 'Natural light is everything 📸 Sometimes the best shots happen in the simplest moments. Feeling grateful for this journey and everyone supporting it! #NaturalLight #Modeling #Grateful',
    likes: 1823,
    comments: 112,
    timeAgo: '3 days ago'
  }
];

export function SocialFeed() {
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <section className="py-16 bg-white">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Follow Our <span className="text-gold">Artists</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            Stay connected with our talent and see their latest projects, behind-the-scenes moments, and achievements
          </p>
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Instagram className="h-5 w-5" />
            <span className="text-sm">Latest from Instagram</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {socialPosts.map((post, index) => (
            <div
              key={post.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onMouseEnter={() => setHoveredPost(post.id)}
              onMouseLeave={() => setHoveredPost(null)}
            >
              {/* Post Header */}
              <div className="p-4 flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden">
                  <Image
                    src={post.artistAvatar}
                    alt={post.artistName}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-foreground">
                    {post.artistName}
                  </h3>
                  <p className="text-xs text-gray-500">{post.artistHandle}</p>
                </div>
                <div className="text-xs text-gray-400">{post.timeAgo}</div>
              </div>

              {/* Post Image */}
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={post.image}
                  alt={`${post.artistName} post`}
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
                {hoveredPost === post.id && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-4 text-white"
                    >
                      <div className="flex items-center gap-1">
                        <Heart className="h-5 w-5" />
                        <span className="text-sm font-semibold">
                          {formatNumber(post.likes)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-5 w-5" />
                        <span className="text-sm font-semibold">
                          {formatNumber(post.comments)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Post Actions */}
              <div className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <button className="flex items-center gap-1 text-gray-700 hover:text-red-500 transition-colors">
                    <Heart className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {formatNumber(post.likes)}
                    </span>
                  </button>
                  <button className="flex items-center gap-1 text-gray-700 hover:text-blue-500 transition-colors">
                    <MessageCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {formatNumber(post.comments)}
                    </span>
                  </button>
                  <button className="flex items-center gap-1 text-gray-700 hover:text-gold transition-colors ml-auto">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>

                {/* Post Caption */}
                <div className="text-sm text-gray-800 leading-relaxed">
                  <span className="font-semibold">{post.artistName}</span>{' '}
                  <span>{post.caption}</span>
                </div>
              </div>
            </div>
          ))}
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
              <a
                href="https://instagram.com/deejaywg"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/30 transition-all"
              >
                @deejaywg
              </a>
              <a
                href="https://instagram.com/jessicadias"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/30 transition-all"
              >
                @jessicadias
              </a>
              <a
                href="https://instagram.com/joaorodolfo"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/30 transition-all"
              >
                @joaorodolfo
              </a>
              <a
                href="https://instagram.com/antoniomonteiro"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/30 transition-all"
              >
                @antoniomonteiro
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
