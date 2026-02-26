"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Camera,
  MapPin,
  Calendar,
  User,
  Building,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Loader2,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareButtons } from "@/components/ui/ShareButtons";
import { ImageSkeleton } from "@/components/ui/image-skeleton";
import { useBatchImagePreloader } from "@/lib/hooks/useImagePreloader";
import { useMobileGestures } from "@/lib/hooks/useMobileGestures";
import type { PortfolioItem } from "@/lib/data/talents";

interface EnhancedLightboxProps {
  items: PortfolioItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

// Helper function to convert YouTube/Vimeo URLs to embed URLs
function getEmbedUrl(url: string): string {
  // Already an embed URL
  if (url.includes('/embed/') || url.includes('player.vimeo.com')) {
    return url;
  }

  // YouTube regular URL conversion
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  // Vimeo regular URL conversion
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return url;
}

export function EnhancedLightbox({
  items,
  currentIndex,
  isOpen,
  onClose,
  onNext,
  onPrevious
}: EnhancedLightboxProps) {
  const [showMetadata, setShowMetadata] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(true);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const currentItem = items[currentIndex];
  const isVideo = currentItem?.type === 'video';

  // Only preload image URLs, not video URLs
  const imageUrls = items
    .filter(item => item.type !== 'video')
    .map(item => item.url);

  // Preload adjacent images for smoother navigation
  const { preloadImages, isLoaded } = useBatchImagePreloader(imageUrls);

  // Preload next and previous images when current changes
  useEffect(() => {
    if (isOpen && !isVideo) {
      // Preload current, next, and previous images
      const indicesToPreload = [
        currentIndex,
        (currentIndex + 1) % items.length,
        (currentIndex - 1 + items.length) % items.length
      ];

      preloadImages(Math.max(0, currentIndex - 1), 3);
    }
  }, [currentIndex, isOpen, preloadImages, items.length, isVideo]);

  // Mobile gesture support - only for images
  useMobileGestures(lightboxRef, {
    onSwipeLeft: onNext,
    onSwipeRight: onPrevious,
    onSwipeDown: onClose,
    onDoubleTap: isVideo ? undefined : () => setZoom(prev => prev === 1 ? 2 : 1),
    onPinchZoom: isVideo ? undefined : (scale) => setZoom(prev => Math.max(1, Math.min(3, prev * scale)))
  });

  const handleZoomIn = () => !isVideo && setZoom(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => !isVideo && setZoom(prev => Math.max(prev - 0.5, 1));
  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse drag for panning when zoomed (only for images)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1 && !isVideo) {
      setIsDragging(true);
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && zoom > 1 && !isVideo) {
      setPosition(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  }, [isDragging, zoom, isVideo]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        onPrevious();
        handleResetZoom();
        break;
      case 'ArrowRight':
        onNext();
        handleResetZoom();
        break;
      case 'i':
      case 'I':
        setShowMetadata(prev => !prev);
        break;
      case '=':
      case '+':
        handleZoomIn();
        break;
      case '-':
        handleZoomOut();
        break;
      case '0':
        handleResetZoom();
        break;
    }
  }, [isOpen, onClose, onNext, onPrevious]);

  // Add keyboard event listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, handleKeyDown]);

  // Reset zoom and loading state when changing items
  useEffect(() => {
    handleResetZoom();
    setImageLoading(true);
    setVideoLoading(true);
  }, [currentIndex]);

  if (!isOpen || !currentItem) return null;

  return (
    
      <div
        ref={lightboxRef}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Controls Bar */}
        <div
          className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-10"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {/* Only show zoom controls for images */}
              {!isVideo && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                    className="text-white hover:bg-white/20"
                  >
                    <ZoomIn className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                    className="text-white hover:bg-white/20"
                  >
                    <ZoomOut className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); handleResetZoom(); }}
                    className="text-white hover:bg-white/20"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                  <span className="text-white/70 text-sm ml-2">{Math.round(zoom * 100)}%</span>
                </>
              )}
              {isVideo && (
                <div className="flex items-center gap-2 text-white/70">
                  <Play className="h-5 w-5" />
                  <span className="text-sm">Video</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); setShowMetadata(!showMetadata); }}
                className="text-white hover:bg-white/20"
              >
                <Camera className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); setShowShareDialog(!showShareDialog); }}
                className="text-white hover:bg-white/20"
              >
                <Share2 className="h-5 w-5" />
              </Button>
              {!isVideo && currentItem.downloadable && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); /* handle download */ }}
                  className="text-white hover:bg-white/20"
                >
                  <Download className="h-5 w-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Container */}
        <div
          ref={imageContainerRef}
          className="absolute inset-0 flex items-center justify-center p-4 pt-20 pb-20"
          onClick={(e) => e.stopPropagation()}
        >
          {isVideo ? (
            /* Video Player */
            <div
              className="relative w-full max-w-4xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {videoLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={getEmbedUrl(currentItem.url)}
                  title={currentItem.title}
                  className="absolute inset-0 w-full h-full rounded-lg shadow-2xl"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={() => setVideoLoading(false)}
                />
              </div>
              {/* Video Title */}
              <div className="mt-4 text-center">
                <h3 className="text-white text-lg font-semibold">{currentItem.title}</h3>
                {currentItem.description && (
                  <p className="text-white/70 text-sm mt-1">{currentItem.description}</p>
                )}
              </div>
            </div>
          ) : (
            /* Image Display */
            <div
              className="relative max-w-full max-h-full"
              style={{
                scale: zoom,
                x: position.x,
                y: position.y,
                cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
              transition={isDragging ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
              onMouseDown={handleMouseDown}
            >
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}

              <Image
                src={currentItem.url}
                alt={currentItem.title}
                width={currentItem.width || 1920}
                height={currentItem.height || 1080}
                className="rounded-lg shadow-2xl"
                style={{ maxHeight: '80vh', width: 'auto', height: 'auto' }}
                onLoadingComplete={() => setImageLoading(false)}
                priority
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onPrevious(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
        >
          <ChevronRight className="h-8 w-8" />
        </Button>

        {/* Image Counter */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/50 px-3 py-1 rounded-full"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {currentIndex + 1} / {items.length}
        </div>

        {/* Metadata Panel */}
        
          {showMetadata && (
            <div
              className="absolute right-0 top-20 bottom-20 w-80 bg-black/80 backdrop-blur-md p-6 overflow-y-auto"
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white font-semibold text-lg mb-4">{currentItem.title}</h3>

              {currentItem.description && (
                <p className="text-white/70 text-sm mb-4">{currentItem.description}</p>
              )}

              {/* Show media type */}
              <div className="mb-4">
                <Badge variant={isVideo ? "secondary" : "default"} className="text-xs">
                  {isVideo ? "Video" : "Image"}
                </Badge>
              </div>

              <div className="space-y-3">
                {currentItem.category && (
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Badge variant="outline" className="text-xs border-white/30 text-white/70">
                      {currentItem.category}
                    </Badge>
                  </div>
                )}

                {currentItem.photographer && (
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <User className="h-4 w-4" />
                    <span>{currentItem.photographer}</span>
                  </div>
                )}

                {currentItem.location && (
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>{currentItem.location}</span>
                  </div>
                )}

                {currentItem.date && (
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>{currentItem.date}</span>
                  </div>
                )}

                {currentItem.client && (
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Building className="h-4 w-4" />
                    <span>{currentItem.client}</span>
                  </div>
                )}

                {currentItem.metadata?.camera && (
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Camera className="h-4 w-4" />
                    <span>{currentItem.metadata.camera}</span>
                  </div>
                )}
              </div>

              {currentItem.tags && currentItem.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {currentItem.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        

        {/* Share Dialog */}
        
          {showShareDialog && (
            <div
              className="absolute top-20 right-4 bg-white rounded-lg p-4 shadow-xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ShareButtons
                url={typeof window !== 'undefined' ? window.location.href : ''}
                title={currentItem.title}
                description={currentItem.description}
              />
            </div>
          )}
        
      </div>
    
  );
}
