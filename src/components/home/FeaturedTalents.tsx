"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Talent } from "@/lib/db/types";
import { motion } from "framer-motion";

export function FeaturedTalents() {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedTalents = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/talents?featured=true');
        const data = await response.json();

        // Limit to 4 talents for grid layout
        setTalents(data.slice(0, 4));
      } catch (error) {
        console.error('Error fetching featured talents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedTalents();
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-black">
        <div className="container px-4 mx-auto text-center">
          <p className="text-gray-400">Loading featured talents...</p>
        </div>
      </section>
    );
  }

  if (talents.length === 0) {
    return null; // Don't show section if no featured talents
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <section className="py-16 bg-black">
      <div className="container px-4 mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            VersaTalent <span className="text-gold">Artists</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Meet some of our exceptional talent making waves across multiple industries
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {talents.map((talent, index) => (
            <motion.div
              key={talent.id}
              variants={item}
              className="group relative overflow-hidden rounded-lg"
            >
              <Link href={`/talents/${talent.id}`}>
                <div className="relative h-80 w-full">
                  {/* Cover image as background if available */}
                  {talent.cover_image && (
                    <Image
                      src={talent.cover_image}
                      alt={`${talent.name} cover`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      quality={75}
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                      loading={index === 0 ? "eager" : "lazy"}
                      priority={index === 0}
                    />
                  )}
                  {/* Profile image - always show if no cover, or overlay on cover */}
                  {!talent.cover_image && (
                    <Image
                      src={talent.image_src}
                      alt={`${talent.name} - ${talent.profession}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      quality={75}
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                      loading={index === 0 ? "eager" : "lazy"}
                      priority={index === 0}
                    />
                  )}
                  {/* Gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  {/* Content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-white font-semibold text-lg">{talent.name}</h3>
                    <p className="text-gold text-sm">{talent.profession}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            href="/talents"
            className="inline-block border-2 border-gold text-gold px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gold hover:text-white transition-all hover:scale-105"
          >
            View All Talents
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
