"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { PortfolioItem } from "@/lib/data/talents";
import { FilterTabs } from "@/components/talents/FilterTabs";
import { MasonryGrid } from "@/components/talents/MasonryGrid";
import { EnhancedLightbox } from "@/components/talents/EnhancedLightbox";

interface PortfolioSectionProps {
  portfolioItems: PortfolioItem[];
}

export function PortfolioSection({ portfolioItems }: PortfolioSectionProps) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('masonry');
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Enhanced filtering with smart sorting
  const filteredItems = useMemo(() => {
    let imageItems = portfolioItems.filter(item => item.type === 'image');

    // Apply filter
    switch (activeFilter) {
      case 'featured':
        imageItems = imageItems.filter(item => item.featured);
        break;
      case 'professional':
        imageItems = imageItems.filter(item => item.professional);
        break;
      case 'recent':
        const currentYear = new Date().getFullYear();
        imageItems = imageItems.filter(item => item.year && item.year >= currentYear - 1);
        break;
      case 'all':
        break;
      default:
        imageItems = imageItems.filter(item =>
          item.category?.toLowerCase() === activeFilter
        );
    }

    // Smart sorting: featured first, then professional, then by year (newest first)
    return imageItems.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      if (a.professional && !b.professional) return -1;
      if (!a.professional && b.professional) return 1;
      return (b.year || 0) - (a.year || 0);
    });
  }, [portfolioItems, activeFilter]);

  const handleItemClick = (index: number) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const handleLightboxClose = () => {
    setIsLightboxOpen(false);
    setLightboxIndex(-1);
  };

  const handleNext = () => {
    setLightboxIndex((prev) =>
      prev < filteredItems.length - 1 ? prev + 1 : prev
    );
  };

  const handlePrevious = () => {
    setLightboxIndex((prev) => prev > 0 ? prev - 1 : prev);
  };

  if (!portfolioItems.length) return null;

  return (
    <motion.div
      className="mt-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <h2 className="text-2xl font-semibold text-foreground mb-6">Portfolio</h2>

      {/* Filter and View Controls */}
      <FilterTabs
        portfolioItems={portfolioItems.filter(item => item.type === 'image')}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Portfolio Grid */}
      <MasonryGrid
        items={filteredItems}
        onItemClick={handleItemClick}
        viewMode={viewMode}
      />

      {/* Enhanced Lightbox */}
      <EnhancedLightbox
        items={filteredItems}
        currentIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        onClose={handleLightboxClose}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
    </motion.div>
  );
}
