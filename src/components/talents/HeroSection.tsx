"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Star, Award } from "lucide-react";
import type { Talent } from "@/lib/data/talents";

interface HeroSectionProps {
  talent: Talent;
}

export function HeroSection({ talent }: HeroSectionProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get the best hero image (prioritize cover_image, then featured portfolio, then profile image)
  const heroImage = useMemo(() => {
    // First priority: use cover_image if available
    if (talent.cover_image) return talent.cover_image;

    // Second priority: portfolio images
    if (!talent.portfolio?.length) return talent.imageSrc;

    const imageItems = talent.portfolio.filter(item => item.type === 'image');

    // Try featured professional shots
    const featuredProfessional = imageItems.find(item => item.featured && item.professional);
    if (featuredProfessional) return featuredProfessional.url;

    // Try any featured shots
    const featured = imageItems.find(item => item.featured);
    if (featured) return featured.url;

    // Try professional shots
    const professional = imageItems.find(item => item.professional);
    if (professional) return professional.url;

    // Finally, use the most recent image or profile image
    const sortedByYear = imageItems.sort((a, b) => (b.year || 0) - (a.year || 0));
    return sortedByYear[0]?.url || talent.imageSrc;
  }, [talent.cover_image, talent.portfolio, talent.imageSrc]);

  // Calculate enhanced stats
  const stats = useMemo(() => {
    const portfolioImages = talent.portfolio?.filter(item => item.type === 'image') || [];
    const currentYear = new Date().getFullYear();

    return {
      totalShots: portfolioImages.length,
      recentWork: portfolioImages.filter(item => item.year && item.year >= currentYear - 1).length,
      professionalShots: portfolioImages.filter(item => item.professional).length,
      featuredWork: portfolioImages.filter(item => item.featured).length,
      collaborations: [...new Set(portfolioImages.map(item => item.client).filter(Boolean))].length,
    };
  }, [talent.portfolio]);

  return (
    <div className="relative h-[70vh] md:h-[80vh] w-full overflow-hidden">
      {/* Hero Image with Progressive Loading and Parallax */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          transform: `translateY(${scrollY * 0.5}px)`,
        }}
      >
        <Image
          src={heroImage}
          alt={`${talent.name} - ${talent.profession}`}
          fill
          priority
          className="object-cover transition-transform duration-700"
          onLoad={() => setIsLoaded(true)}
          onError={() => setImageError(true)}
          quality={95}
        />

        {/* Image overlay for better text contrast */}
        <div className="absolute inset-0 bg-black/10" />
      </motion.div>

      {/* Fallback for image loading error */}
      {imageError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-20 h-20 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-10 h-10 text-gold" />
            </div>
            <p className="text-xl font-semibold">{talent.name}</p>
            <p className="text-gold">{talent.profession}</p>
          </div>
        </div>
      )}

      {/* Enhanced Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-purple-900/20" />

      {/* Dynamic lighting effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial from-gold/20 via-transparent to-transparent"
        animate={{
          opacity: [0.3, 0.5, 0.3],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-end">
        <div className="container mx-auto px-4 pb-8 md:pb-12">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {/* Industry Badge */}
              <Badge className="mb-4 bg-gold/90 text-black font-medium px-3 py-1.5 text-sm">
                <Star className="w-3 h-3 mr-1" />
                {talent.industry.charAt(0).toUpperCase() + talent.industry.slice(1)} Talent
              </Badge>

              {/* Name and Tagline */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-3 leading-tight">
                {talent.name}
              </h1>

              <p className="text-xl md:text-2xl text-gold-200 mb-6 font-light">
                {talent.tagline}
              </p>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 md:gap-8 text-white/90">
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <MapPin className="w-4 h-4 text-gold" />
                  <span className="text-sm md:text-base">{talent.location}</span>
                </motion.div>

                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <Award className="w-4 h-4 text-gold" />
                  <span className="text-sm md:text-base">{stats.professionalShots} Professional Shots</span>
                </motion.div>

                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <Calendar className="w-4 h-4 text-gold" />
                  <span className="text-sm md:text-base">{stats.recentWork} Recent Projects</span>
                </motion.div>

                {stats.collaborations > 0 && (
                  <motion.div
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                  >
                    <Star className="w-4 h-4 text-gold" />
                    <span className="text-sm md:text-base">{stats.collaborations} Brand Collaborations</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Loading Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
