"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Grid, List, Star } from "lucide-react";
import type { PortfolioItem } from "@/lib/data/talents";

interface FilterTabsProps {
  portfolioItems: PortfolioItem[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  viewMode: 'grid' | 'masonry';
  onViewModeChange: (mode: 'grid' | 'masonry') => void;
}

export function FilterTabs({
  portfolioItems,
  activeFilter,
  onFilterChange,
  viewMode,
  onViewModeChange
}: FilterTabsProps) {
  // Get unique categories with counts
  const categories = portfolioItems.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get featured count
  const featuredCount = portfolioItems.filter(item => item.featured).length;
  const professionalCount = portfolioItems.filter(item => item.professional).length;

  const filters = [
    { id: 'all', label: 'All', count: portfolioItems.length },
    { id: 'featured', label: 'Featured', count: featuredCount },
    { id: 'professional', label: 'Professional', count: professionalCount },
    ...Object.entries(categories).map(([category, count]) => ({
      id: category.toLowerCase(),
      label: category,
      count
    }))
  ];

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;

          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                ${isActive
                  ? 'bg-gold text-black shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span>{filter.label}</span>
                <span className={`
                  text-xs px-1.5 py-0.5 rounded-full
                  ${isActive ? 'bg-black/20' : 'bg-gray-300'}
                `}>
                  {filter.count}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 mr-2">View:</span>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className={`h-8 px-3 rounded-md ${
              viewMode === 'grid' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange('masonry')}
            className={`h-8 px-3 rounded-md ${
              viewMode === 'masonry' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
