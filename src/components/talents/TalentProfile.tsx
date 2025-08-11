"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import type { Talent } from "@/lib/data/talents";
import { PortfolioSection } from "./PortfolioSection";
import { HeroSection } from "./HeroSection";

interface TalentProfileProps {
  talent: Talent;
}

export function TalentProfile({ talent }: TalentProfileProps) {
  return (
    <div className="bg-white py-10 md:py-16">
        <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* Talent Image and Quick Stats */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="aspect-[3/4] relative rounded-lg overflow-hidden mb-6 shadow-md"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Image
                src={talent.imageSrc}
                alt={talent.name}
                fill
                priority
                className="object-cover"
              />
            </motion.div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <motion.div
                className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <p className="text-xs text-gray-500 uppercase">Industry</p>
                <p className="text-foreground font-medium mt-1 capitalize">{talent.industry}</p>
              </motion.div>
              <motion.div
                className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <p className="text-xs text-gray-500 uppercase">Profession</p>
                <p className="text-foreground font-medium mt-1 capitalize">{talent.profession}</p>
              </motion.div>
              <motion.div
                className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <p className="text-xs text-gray-500 uppercase">Gender</p>
                <p className="text-foreground font-medium mt-1 capitalize">{talent.gender}</p>
              </motion.div>
              <motion.div
                className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <p className="text-xs text-gray-500 uppercase">Location</p>
                <p className="text-foreground font-medium mt-1">{talent.location}</p>
              </motion.div>
            </div>

            {/* Social Links */}
            {talent.socialLinks && (
              <motion.div
                className="mt-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <h3 className="text-foreground text-lg font-semibold mb-3">Connect</h3>
                <div className="flex gap-3">
                  {talent.socialLinks.instagram && (
                    <motion.a
                      href={talent.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-50 hover:bg-gray-100 p-3 rounded-lg text-gold border border-gray-200 shadow-sm"
                      whileHover={{ scale: 1.1, y: -3 }}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 2H7C4.23858 2 2 4.23858 2 7V17C2 19.7614 4.23858 22 7 22H17C19.7614 22 22 19.7614 22 17V7C22 4.23858 19.7614 2 17 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 11.37C16.1234 12.2022 15.9813 13.0522 15.5938 13.799C15.2063 14.5458 14.5931 15.1514 13.8416 15.5297C13.0901 15.9079 12.2384 16.0396 11.4078 15.9059C10.5771 15.7723 9.80976 15.3801 9.21484 14.7852C8.61991 14.1902 8.22773 13.4229 8.09406 12.5922C7.9604 11.7616 8.09206 10.9099 8.47032 10.1584C8.84858 9.40685 9.45418 8.79374 10.201 8.40624C10.9478 8.01874 11.7978 7.87659 12.63 8C13.4789 8.12588 14.2648 8.52146 14.8717 9.12831C15.4785 9.73515 15.8741 10.5211 16 11.37Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17.5 6.5H17.51" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.a>
                  )}
                  {talent.socialLinks.twitter && (
                    <motion.a
                      href={talent.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-50 hover:bg-gray-100 p-3 rounded-lg text-gold border border-gray-200 shadow-sm"
                      whileHover={{ scale: 1.1, y: -3 }}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23 3C22.0424 3.67548 20.9821 4.19211 19.86 4.53C19.2577 3.83751 18.4573 3.34669 17.567 3.12393C16.6767 2.90116 15.7395 2.9572 14.8821 3.28445C14.0247 3.61171 13.2884 4.1944 12.773 4.95372C12.2575 5.71303 11.9877 6.61234 12 7.53V8.53C10.2426 8.57557 8.50127 8.18581 6.93101 7.39545C5.36074 6.60508 4.01032 5.43864 3 4C3 4 -1 13 8 17C5.94053 18.398 3.48716 19.0989 1 19C10 24 21 19 21 7.5C20.9991 7.22145 20.9723 6.94359 20.92 6.67C21.9406 5.66349 22.6608 4.39271 23 3V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.a>
                  )}
                  {talent.socialLinks.youtube && (
                    <motion.a
                      href={talent.socialLinks.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-50 hover:bg-gray-100 p-3 rounded-lg text-gold border border-gray-200 shadow-sm"
                      whileHover={{ scale: 1.1, y: -3 }}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.5401 6.42C22.4213 5.94541 22.1794 5.51057 21.8387 5.15941C21.4979 4.80824 21.0708 4.55318 20.6001 4.42C18.8801 4 12.0001 4 12.0001 4C12.0001 4 5.12008 4 3.40008 4.46C2.92933 4.59318 2.50225 4.84824 2.16151 5.19941C1.82078 5.55057 1.57886 5.98541 1.46008 6.46C1.14577 8.20556 0.991568 9.97631 1.00008 11.75C0.988741 13.537 1.14295 15.3213 1.46008 17.08C1.59104 17.5398 1.83839 17.9581 2.17823 18.2945C2.51806 18.6308 2.9389 18.8738 3.40008 19C5.12008 19.46 12.0001 19.46 12.0001 19.46C12.0001 19.46 18.8801 19.46 20.6001 19C21.0708 18.8668 21.4979 18.6118 21.8387 18.2606C22.1794 17.9094 22.4213 17.4746 22.5401 17C22.8524 15.2676 23.0064 13.5103 23.0001 11.75C23.0114 9.96295 22.8572 8.17862 22.5401 6.42V6.42Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9.75 15.02L15.5 11.75L9.75 8.48001V15.02Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.a>
                  )}
                  {talent.socialLinks?.tiktok && (
                    <motion.a
                      href={talent.socialLinks.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-50 hover:bg-gray-100 p-3 rounded-lg text-gold border border-gray-200 shadow-sm"
                      whileHover={{ scale: 1.1, y: -3 }}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 9.5C21.3 9.5 22 8 22 8V4C22 4 20.8 5.5 19 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19 5.5V15.5C19 19.5 15 21.5 12 21.5C9 21.5 6 19.5 5 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 8.5C9.23858 8.5 7 10.7386 7 13.5C7 16.2614 9.23858 18.5 12 18.5C14.7614 18.5 17 16.2614 17 13.5V2.5H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13 13.5C13 12.3954 12.1046 11.5 11 11.5C9.89543 11.5 9 12.3954 9 13.5C9 14.6046 9.89543 15.5 11 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.a>
                  )}
                  {talent.socialLinks?.linkedin && (
                    <motion.a
                      href={talent.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-50 hover:bg-gray-100 p-3 rounded-lg text-gold border border-gray-200 shadow-sm"
                      whileHover={{ scale: 1.1, y: -3 }}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 8C17.5913 8 19.1174 8.63214 20.2426 9.75736C21.3679 10.8826 22 12.4087 22 14V21H18V14C18 13.4696 17.7893 12.9609 17.4142 12.5858C17.0391 12.2107 16.5304 12 16 12C15.4696 12 14.9609 12.2107 14.5858 12.5858C14.2107 12.9609 14 13.4696 14 14V21H10V14C10 12.4087 10.6321 10.8826 11.7574 9.75736C12.8826 8.63214 14.4087 8 16 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 9H2V21H6V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 6C5.10457 6 6 5.10457 6 4C6 2.89543 5.10457 2 4 2C2.89543 2 2 2.89543 2 4C2 5.10457 2.89543 6 4 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.a>
                  )}
                  {talent.socialLinks?.website && (
                    <motion.a
                      href={talent.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-50 hover:bg-gray-100 p-3 rounded-lg text-gold border border-gray-200 shadow-sm"
                      whileHover={{ scale: 1.1, y: -3 }}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2V2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.a>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Talent Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">{talent.name}</h1>
              <p className="text-gold text-lg mb-4">{talent.tagline}</p>

              <Badge
                variant="outline"
                className="mb-6 text-gold border-gold-20 text-sm py-1.5 px-3"
              >
                {talent.industry.charAt(0).toUpperCase() + talent.industry.slice(1)}
              </Badge>
            </motion.div>

            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <h2 className="text-xl font-semibold text-foreground mb-3">Bio</h2>
              <p className="text-gray-600 leading-relaxed">{talent.bio}</p>
            </motion.div>

            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold text-foreground mb-4">Skills & Specialties</h2>
              <div className="flex flex-wrap gap-2">
                {talent.skills.map((skill, index) => (
                  <motion.div
                    key={skill}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: 0.1 + index * 0.05 }}
                  >
                    <Badge className="bg-gold-10 text-gold hover:bg-gold-20 border border-gold-20">
                      {skill}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Portfolio Section */}
            {talent.portfolio && talent.portfolio.length > 0 && (
              <PortfolioSection portfolioItems={talent.portfolio} />
            )}

            <motion.div
              className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{
                y: -5,
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
              }}
            >
              <h2 className="text-xl font-semibold text-foreground mb-4">Book This Talent</h2>
              <p className="text-gray-600 mb-6">
                Interested in working with {talent.name}? Contact our team to discuss availability and booking details.
              </p>
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button asChild className="bg-gold hover:bg-gold-80 text-white w-full">
                  <Link href="/contact">
                    Get in Touch
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
