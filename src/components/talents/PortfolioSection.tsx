"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PortfolioItem } from "@/lib/data/talents";
import { ThumbnailCarousel } from "@/components/ui/ThumbnailCarousel";

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

      {/* Enhanced Modal for selected item */}
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
                {selectedItem.featured && (
                  <Badge className="mt-2 bg-gold text-black text-xs">Featured</Badge>
                )}
                {selectedItem.professional && (
                  <Badge className="mt-2 ml-1 bg-blue-500 text-white text-xs">Professional</Badge>
                )}
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

            {/* Additional metadata */}
            {(selectedItem.photographer || selectedItem.location || selectedItem.client) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-medium mb-2 text-sm text-gray-800">Details</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {selectedItem.photographer && <div>Photographer: {selectedItem.photographer}</div>}
                  {selectedItem.location && <div>Location: {selectedItem.location}</div>}
                  {selectedItem.client && <div>Client: {selectedItem.client}</div>}
                  {selectedItem.year && <div>Year: {selectedItem.year}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
