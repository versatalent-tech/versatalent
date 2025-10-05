"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
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
  Loader2
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
  const lightboxRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const currentItem = items[currentIndex];

  // Preload adjacent images for smoother navigation
  const { preloadImages, isLoaded } = useBatchImagePreloader(
    items.map(item => item.url)
  );

  // Preload next and previous images when current changes
  useEffect(() => {
    if (isOpen) {
      // Preload current, next, and previous images
      const indicesToPreload = [
        currentIndex,
        (currentIndex + 1) % items.length,
        (currentIndex - 1 + items.length) % items.length
      ];

      preloadImages(Math.max(0, currentIndex - 1), 3);
    }
  }, [currentIndex, isOpen, preloadImages, items.length]);

  // Mobile gesture support
  useMobileGestures(lightboxRef, {
    onSwipeLeft: onNext,
    onSwipeRight: onPrevious,
    onSwipeDown: onClose,
    onDoubleTap: () => setZoom(prev => prev === 1 ? 2 : 1),
    onPinchZoom: (scale) => setZoom(prev => Math.max(1, Math.min(3, prev * scale)))
  });

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));
  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse drag for panning when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  }, [isDragging, zoom]);

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

  // Reset zoom when changing images
  useEffect(() => {
    handleResetZoom();
    setImageLoading(true);
  }, [currentIndex]);

  if (!isOpen || !currentItem) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={lightboxRef}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Controls Bar */}
        <motion.div
          className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-10"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
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
              {currentItem.downloadable && (
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
        </motion.div>

        {/* Main Image Container */}
        <div
          ref={imageContainerRef}
          className="absolute inset-0 flex items-center justify-center p-4 pt-20 pb-20"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
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
          </motion.div>
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
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/50 px-3 py-1 rounded-full"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {currentIndex + 1} / {items.length}
        </motion.div>

        {/* Metadata Panel */}
        <AnimatePresence>
          {showMetadata && currentItem.metadata && (
            <motion.div
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

              <div className="space-y-3">
                {currentItem.metadata.camera && (
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Camera className="h-4 w-4" />
                    <span>{currentItem.metadata.camera}</span>
                  </div>
                )}

                {currentItem.metadata.location && (
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>{currentItem.metadata.location}</span>
                  </div>
                )}

                {currentItem.metadata.date && (
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(currentItem.metadata.date).toLocaleDateString()}</span>
                  </div>
                )}

                {currentItem.metadata.photographer && (
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <User className="h-4 w-4" />
                    <span>{currentItem.metadata.photographer}</span>
                  </div>
                )}

                {currentItem.metadata.client && (
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Building className="h-4 w-4" />
                    <span>{currentItem.metadata.client}</span>
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Share Dialog */}
        <AnimatePresence>
          {showShareDialog && (
            <motion.div
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
