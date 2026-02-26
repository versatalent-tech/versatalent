"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
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
  Heart,
  Download,
  Share2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImageSkeleton } from "@/components/ui/image-skeleton";
import { useImagePreloader } from "@/lib/hooks/useImagePreloader";
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
  viewMode: 'grid' | 'masonry';
}

function GridItem({ item, index, onClick, viewMode }: GridItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: '200px'
  });

  const { isLoaded, preload } = useImagePreloader(item.thumbnailUrl || item.url);

  // Preload image when in view
  useEffect(() => {
    if (inView && !isLoaded) {
      preload();
    }
  }, [inView, isLoaded, preload]);

  const aspectRatio = viewMode === 'grid'
    ? 'aspect-[4/3]'
    : item.height && item.width
      ? `aspect-[${item.width}/${item.height}]`
      : 'aspect-auto';

  return (
    <div
      ref={ref}
      className={`relative group cursor-pointer overflow-hidden rounded-lg shadow-md transition-all duration-300 hover:scale-[1.02] ${
        viewMode === 'grid' ? 'h-full' : ''
      } ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ transitionDelay: `${index * 50}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className={`relative ${aspectRatio} bg-gray-100`}>
        {!isLoaded && inView && (
          <ImageSkeleton className="absolute inset-0" />
        )}

        {inView && !imageError && (
          <Image
            src={item.thumbnailUrl || item.url}
            alt={item.title}
            fill
            sizes={viewMode === 'grid'
              ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            }
            className={`object-cover transition-all duration-500 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onError={() => setImageError(true)}
            quality={75}
          />
        )}

        {/* Video Indicator */}
        {item.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-full p-4">
              <Play className="w-8 h-8 text-white" fill="white" />
            </div>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1 z-10">
          {item.featured && (
            <div className="animate-in zoom-in duration-300" style={{ animationDelay: '200ms' }}>
              <Badge className="bg-amber-500 text-white text-xs px-2 py-0.5">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            </div>
          )}
          {item.professional && (
            <div className="animate-in zoom-in duration-300" style={{ animationDelay: '300ms' }}>
              <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5">
                <Award className="w-3 h-3 mr-1" />
                Pro
              </Badge>
            </div>
          )}
        </div>

        {/* Hover Overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent animate-in fade-in duration-200">
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <h3 className="font-semibold text-lg mb-1 animate-in slide-in-from-bottom-2 duration-200">
                {item.title}
              </h3>

              {item.description && (
                <p className="text-sm text-white/80 line-clamp-2 animate-in slide-in-from-bottom-2 duration-200" style={{ animationDelay: '50ms' }}>
                  {item.description}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center gap-3 text-xs text-white/70">
                  {item.metadata?.date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(item.metadata.date).getFullYear()}</span>
                    </div>
                  )}
                  {item.metadata?.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{item.metadata.location}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {item.downloadable && (
                    <button
                      className="p-1.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    className="p-1.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Share2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MasonryGrid({ items, onItemClick, viewMode }: MasonryGridProps) {
  const [loadedCount, setLoadedCount] = useState(12);
  const [isLoading, setIsLoading] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Sort items by priority
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      if (a.professional && !b.professional) return -1;
      if (!a.professional && b.professional) return 1;
      if (a.metadata?.date && b.metadata?.date) {
        return new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime();
      }
      return 0;
    });
  }, [items]);

  const visibleItems = sortedItems.slice(0, loadedCount);

  const breakpointColumns = {
    default: 4,
    1536: 4,
    1280: 3,
    1024: 3,
    768: 2,
    640: 1
  };

  const { ref: loadMoreInViewRef, inView: loadMoreInView } = useInView({
    threshold: 0,
    rootMargin: '100px'
  });

  useEffect(() => {
    if (loadMoreInView && loadedCount < items.length && !isLoading) {
      setIsLoading(true);
      setTimeout(() => {
        setLoadedCount(prev => Math.min(prev + 12, items.length));
        setIsLoading(false);
      }, 300);
    }
  }, [loadMoreInView, loadedCount, items.length, isLoading]);

  if (viewMode === 'grid') {
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleItems.map((item, index) => (
            <GridItem
              key={item.id || index}
              item={item}
              index={index}
              onClick={() => onItemClick(index)}
              viewMode={viewMode}
            />
          ))}
        </div>

        {loadedCount < items.length && (
          <div ref={loadMoreInViewRef} className="mt-8 flex justify-center">
            {isLoading ? (
              <div className="flex items-center gap-2 text-gray-500 animate-in fade-in">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                <span>Loading more...</span>
              </div>
            ) : (
              <button
                onClick={() => setLoadedCount(prev => Math.min(prev + 12, items.length))}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Load More ({items.length - loadedCount} remaining)
              </button>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <Masonry
        breakpointCols={breakpointColumns}
        className="flex -ml-4 w-auto"
        columnClassName="pl-4 bg-clip-padding"
      >
        {visibleItems.map((item, index) => (
          <div key={item.id || index} className="mb-4">
            <GridItem
              item={item}
              index={index}
              onClick={() => onItemClick(index)}
              viewMode={viewMode}
            />
          </div>
        ))}
      </Masonry>

      {loadedCount < items.length && (
        <div ref={loadMoreInViewRef} className="mt-8 flex justify-center">
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-500 animate-in fade-in">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              <span>Loading more...</span>
            </div>
          ) : (
            <button
              onClick={() => setLoadedCount(prev => Math.min(prev + 12, items.length))}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Load More ({items.length - loadedCount} remaining)
            </button>
          )}
        </div>
      )}
    </>
  );
}
