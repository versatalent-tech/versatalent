"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Masonry from "react-masonry-css";
import {
  Play,
  Star,
  Award,
  Calendar,
  MapPin,
  User,
  Building,
  Eye,
  Heart
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PortfolioItem } from "@/lib/data/talents";

interface MasonryGridProps {
  items: PortfolioItem[];
  onItemClick: (index: number) => void;
  viewMode: 'grid' | 'masonry';
}

interface GridItemProps {
  item: PortfolioItem;
  index: number;
  onClick: () => void;
}

function GridItem({ item, index, onClick }: GridItemProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [preloadError, setPreloadError] = useState(false);
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
    rootMargin: '50px'
  });

  // Preload next images for smoother navigation
  useEffect(() => {
    if (inView && index < 10) { // Preload first 10 images
      const img = new Image();
      img.src = item.thumbnailUrl || item.url;
    }
  }, [inView, index, item]);

  return (
    <motion.div
      ref={ref}
      className="group relative cursor-pointer break-inside-avoid mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -5 }}
    >
      <div className="relative rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
        {/* Image */}
        <div className="relative aspect-auto">
          {inView && (
            <Image
              src={item.thumbnailUrl || item.url}
              alt={item.title}
              width={400}
              height={600}
              className={`
                w-full h-auto object-cover transition-all duration-500
                ${isLoaded ? 'blur-0' : 'blur-sm'}
                ${isHovered ? 'scale-105' : 'scale-100'}
              `}
              onLoad={() => setIsLoaded(true)}
              onError={() => setPreloadError(true)}
            />
          )}

          {/* Loading Placeholder */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
        </div>

        {/* Video Play Button */}
        {item.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="bg-black/50 rounded-full p-4 backdrop-blur-sm"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Play className="w-8 h-8 text-white fill-current" />
            </motion.div>
          </div>
        )}

        {/* Quality Indicators */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {item.featured && (
            <Badge className="bg-gold text-black text-xs px-2 py-1">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          )}
          {item.professional && (
            <Badge className="bg-blue-500 text-white text-xs px-2 py-1">
              <Award className="w-3 h-3 mr-1" />
              Pro
            </Badge>
          )}
        </div>

        {/* Hover Overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2">{item.title}</h3>
            <p className="text-sm text-white/80 mb-3 line-clamp-2">{item.description}</p>

            {/* Metadata Icons */}
            <div className="flex items-center gap-4 text-xs text-white/70">
              {item.date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{item.date}</span>
                </div>
              )}
              {item.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{item.location}</span>
                </div>
              )}
              {item.client && (
                <div className="flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  <span>{item.client}</span>
                </div>
              )}
            </div>

            {/* Category Badge */}
            {item.category && (
              <Badge
                variant="outline"
                className="mt-2 text-white border-white/30 bg-white/10 backdrop-blur-sm text-xs"
              >
                {item.category}
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="absolute top-3 right-3 flex flex-col gap-1"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <button className="bg-white/20 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/30 transition-colors">
            <Eye className="w-4 h-4" />
          </button>
          <button className="bg-white/20 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/30 transition-colors">
            <Heart className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function MasonryGrid({ items, onItemClick, viewMode }: MasonryGridProps) {
  const breakpointColumns = {
    default: 3,
    1100: 3,
    700: 2,
    500: 1
  };

  const gridBreakpoints = {
    default: 4,
    1200: 3,
    768: 2,
    480: 1
  };

  if (viewMode === 'masonry') {
    return (
      <Masonry
        breakpointCols={breakpointColumns}
        className="flex -ml-4 w-auto"
        columnClassName="pl-4 bg-clip-padding"
      >
        {items.map((item, index) => (
          <GridItem
            key={item.id}
            item={item}
            index={index}
            onClick={() => onItemClick(index)}
          />
        ))}
      </Masonry>
    );
  }

  // Grid layout
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item, index) => (
        <div key={item.id} className="aspect-[3/4]">
          <GridItem
            item={item}
            index={index}
            onClick={() => onItemClick(index)}
          />
        </div>
      ))}
    </div>
  );
}
