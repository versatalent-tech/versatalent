"use client";

import { useState, useCallback, useEffect } from "react";
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
  Maximize
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareButtons } from "@/components/ui/ShareButtons";
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

  const currentItem = items[currentIndex];

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));
  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        onPrevious();
        break;
      case 'ArrowRight':
        onNext();
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
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !currentItem) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/95 flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Main Image Area */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          <motion.div
            className="relative max-w-full max-h-full"
            style={{
              transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
              cursor: zoom > 1 ? 'grab' : 'default'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={currentItem.url}
              alt={currentItem.title}
              width={1200}
              height={800}
              className="object-contain max-h-[90vh]"
              priority
            />
          </motion.div>

          {/* Navigation Controls */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
            onClick={onPrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
            onClick={onNext}
            disabled={currentIndex === items.length - 1}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>

          {/* Top Controls */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-white">
              <span className="text-sm bg-black/50 px-2 py-1 rounded">
                {currentIndex + 1} of {items.length}
              </span>
              {currentItem.featured && (
                <Badge className="bg-gold text-black text-xs">Featured</Badge>
              )}
              {currentItem.professional && (
                <Badge className="bg-blue-500 text-white text-xs">Professional</Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/50 hover:bg-black/70 text-white"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="bg-black/50 hover:bg-black/70 text-white"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="bg-black/50 hover:bg-black/70 text-white"
                onClick={handleResetZoom}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>

              {/* Toggle Metadata */}
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setShowMetadata(!showMetadata)}
              >
                <Camera className="w-4 h-4" />
              </Button>

              {/* Share */}
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setShowShareDialog(!showShareDialog)}
              >
                <Share2 className="w-4 h-4" />
              </Button>

              {/* Close */}
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/50 hover:bg-black/70 text-white"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Metadata Panel */}
        <AnimatePresence>
          {showMetadata && (
            <motion.div
              className="w-80 bg-white p-6 overflow-y-auto"
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-4">{currentItem.title}</h3>

              <div className="space-y-4">
                <p className="text-gray-600">{currentItem.description}</p>

                {/* Basic Info */}
                <div className="space-y-2">
                  {currentItem.date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{currentItem.date}</span>
                    </div>
                  )}

                  {currentItem.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{currentItem.location}</span>
                    </div>
                  )}

                  {currentItem.photographer && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{currentItem.photographer}</span>
                    </div>
                  )}

                  {currentItem.client && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span>{currentItem.client}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {currentItem.tags && currentItem.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {currentItem.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Camera Metadata */}
                {currentItem.metadata && (
                  <div>
                    <h4 className="font-medium mb-2">Camera Info</h4>
                    <div className="text-sm space-y-1 text-gray-600">
                      {currentItem.metadata.camera && (
                        <div>Camera: {currentItem.metadata.camera}</div>
                      )}
                      {currentItem.metadata.lens && (
                        <div>Lens: {currentItem.metadata.lens}</div>
                      )}
                      {currentItem.metadata.iso && (
                        <div>ISO: {currentItem.metadata.iso}</div>
                      )}
                      {currentItem.metadata.aperture && (
                        <div>Aperture: {currentItem.metadata.aperture}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Download Button */}
                {currentItem.downloadUrl && (
                  <Button asChild className="w-full">
                    <a href={currentItem.downloadUrl} download>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </a>
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Share Dialog */}
        <AnimatePresence>
          {showShareDialog && (
            <motion.div
              className="absolute bottom-4 right-4 bg-white rounded-lg p-4 shadow-xl min-w-[300px]"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ShareButtons title={currentItem.title} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
