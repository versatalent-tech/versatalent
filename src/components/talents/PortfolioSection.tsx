"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import type { PortfolioItem } from "@/lib/data/talents";
import { FilterTabs } from "./FilterTabs";
import { MasonryGrid } from "./MasonryGrid";
import { EnhancedLightbox } from "./EnhancedLightbox";
import { GridSkeleton, MasonrySkeleton } from "@/components/ui/image-skeleton";

interface PortfolioSectionProps {
  portfolioItems: PortfolioItem[];
}

export function PortfolioSection({ portfolioItems }: PortfolioSectionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('masonry');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Filter items based on active filter
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') {
      return portfolioItems;
    }

    if (activeFilter === 'featured') {
      return portfolioItems.filter(item => item.featured);
    }

    if (activeFilter === 'professional') {
      return portfolioItems.filter(item => item.professional);
    }

    // Filter by category
    return portfolioItems.filter(item =>
      item.category?.toLowerCase() === activeFilter.toLowerCase()
    );
  }, [portfolioItems, activeFilter]);

  const handleItemClick = (index: number) => {
    setSelectedIndex(index);
  };

  const handleLightboxClose = () => {
    setSelectedIndex(null);
  };

  const handleLightboxNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % filteredItems.length);
    }
  };

  const handleLightboxPrevious = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + filteredItems.length) % filteredItems.length);
    }
  };

  return (
    <motion.section
      className="py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Portfolio Gallery
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore a curated collection of professional work showcasing creativity and expertise
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <FilterTabs
            portfolioItems={portfolioItems}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </motion.div>

        {/* Portfolio Grid/Masonry */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {isLoading ? (
            viewMode === 'grid' ? (
              <GridSkeleton count={8} />
            ) : (
              <MasonrySkeleton count={8} />
            )
          ) : (
            <MasonryGrid
              items={filteredItems}
              onItemClick={handleItemClick}
              viewMode={viewMode}
            />
          )}
        </motion.div>

        {/* Stats Section */}
        {!isLoading && (
          <motion.div
            className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {portfolioItems.length}
              </div>
              <div className="text-sm text-gray-600">Total Works</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-500">
                {portfolioItems.filter(i => i.featured).length}
              </div>
              <div className="text-sm text-gray-600">Featured</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-500">
                {portfolioItems.filter(i => i.professional).length}
              </div>
              <div className="text-sm text-gray-600">Professional</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {[...new Set(portfolioItems.map(i => i.category))].filter(Boolean).length}
              </div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Enhanced Lightbox */}
      {selectedIndex !== null && (
        <EnhancedLightbox
          items={filteredItems}
          currentIndex={selectedIndex}
          isOpen={selectedIndex !== null}
          onClose={handleLightboxClose}
          onNext={handleLightboxNext}
          onPrevious={handleLightboxPrevious}
        />
      )}
    </motion.section>
  );
}
