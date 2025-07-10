"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PortfolioItem } from "@/lib/data/talents";
import dynamic from "next/dynamic";
import { ThumbnailCarousel } from "@/components/ui/ThumbnailCarousel";
import { Lightbox } from "yet-another-react-lightbox";

interface PortfolioSectionProps {
  portfolioItems: PortfolioItem[];
}

export function PortfolioSection({ portfolioItems }: PortfolioSectionProps) {
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

  const imageItems = portfolioItems.filter(item => item.type === 'image');
  const videoItems = portfolioItems.filter(item => item.type === 'video');

  const categories = [...new Set(portfolioItems.map(item => item.category))].filter(Boolean) as string[];

  return (
    <motion.div
      className="mt-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <h2 className="text-2xl font-semibold text-foreground mb-6">Portfolio</h2>

      {categories.length > 0 && (
        <Tabs defaultValue="all" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map(category => (
              <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <ThumbnailCarousel
              items={portfolioItems.filter(i=>i.type==='image').map(i=>({src:i.url,alt:i.title}))}
              onSelect={(idx)=>setSelectedItem(portfolioItems.filter(i=>i.type==='image')[idx])}
            />
          </TabsContent>

          {categories.map(category => (
            <TabsContent key={category} value={category} className="mt-0">
              <ThumbnailCarousel
                items={portfolioItems.filter(item=>item.category===category && item.type==='image').map(i=>({src:i.url,alt:i.title}))}
                onSelect={(idx)=>{
                  const catItems=portfolioItems.filter(item=>item.category===category && item.type==='image');
                  setSelectedItem(catItems[idx]);
                }}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {categories.length === 0 && (
        <ThumbnailCarousel
          items={portfolioItems.filter(i=>i.type==='image').map(i=>({src:i.url,alt:i.title}))}
          onSelect={(idx)=>setSelectedItem(portfolioItems.filter(i=>i.type==='image')[idx])}
        />
      )}

      {/* Modal for selected item */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-xl font-semibold">{selectedItem.title}</h3>
                <p className="text-gray-600 text-sm">
                  {selectedItem.date && `${selectedItem.date} • `}
                  {selectedItem.category && (
                    <Badge variant="outline" className="ml-1 text-gold border-gold-20">
                      {selectedItem.category}
                    </Badge>
                  )}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-2xl text-gray-500 hover:text-gray-800"
              >
                &times;
              </button>
            </div>

            <div className="my-4">
              {selectedItem.type === 'image' ? (
                <div className="relative h-[60vh] w-full">
                  <Image
                    src={selectedItem.url}
                    alt={selectedItem.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 90vw, (max-width: 1200px) 75vw, 800px"
                  />
                </div>
              ) : (
                <div className="relative aspect-video w-full">
                  <iframe
                    src={selectedItem.url}
                    title={selectedItem.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              )}
            </div>

            <p className="text-gray-700 my-2">{selectedItem.description}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function PortfolioGrid({
  portfolioItems,
  onItemClick
}: {
  portfolioItems: PortfolioItem[];
  onItemClick: (item: PortfolioItem) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {portfolioItems.map((item) => (
        <motion.div
          key={item.id}
          className="relative group cursor-pointer overflow-hidden rounded-lg shadow-md"
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onItemClick(item)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="aspect-[4/3] relative">
            <Image
              src={item.type === 'video' && item.thumbnailUrl ? item.thumbnailUrl : item.url}
              alt={item.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/40 rounded-full p-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                    <path d="M5 3L19 12L5 21V3Z" fill="currentColor" />
                  </svg>
                </div>
              </div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
            <h3 className="font-medium">{item.title}</h3>
            <p className="text-xs text-white/80 line-clamp-1">{item.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
