"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { getFeaturedTalents } from "@/lib/data/talents";

export function FeaturedTalents() {
  const containerRef = useRef<HTMLDivElement>(null);
  const talents = getFeaturedTalents();

  // Make sure Jessica Dias is always included and shown first if featured
  const jessicaDias = talents.find(talent => talent.name === 'Jessica Dias');
  const otherTalents = talents.filter(talent => talent.name !== 'Jessica Dias');
  const orderedTalents = jessicaDias ? [jessicaDias, ...otherTalents] : talents;

  return (
    <section className="py-16 bg-gray-50">
      <div className="container px-4 mx-auto">
        <div className="max-w-xl mx-auto text-center mb-16">
          <motion.h2
            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Featured <span className="text-gold">Talent</span>
          </motion.h2>
          <motion.p
            className="mt-4 text-lg leading-8 text-gray-600"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Discover top professionals making waves in their industries
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" ref={containerRef}>
          {orderedTalents.slice(0, 4).map((talent, index) => (
            <motion.div
              key={talent.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link href={`/talents/${talent.id}`} className="block overflow-hidden rounded-t-lg relative h-72 w-full">
                <Image
                  src={talent.imageSrc}
                  alt={talent.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  quality={80}
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                />
              </Link>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-foreground">{talent.name}</h3>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{talent.tagline}</p>
                <div className="mt-3">
                  <Badge variant="outline" className="text-gold border-gold-20">
                    {talent.industry.charAt(0).toUpperCase() + talent.industry.slice(1)}
                  </Badge>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
