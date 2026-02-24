"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Motion values for parallax effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Transform mouse position into parallax values with damping
  const dampenedX = useSpring(mouseX, { stiffness: 50, damping: 30 });
  const dampenedY = useSpring(mouseY, { stiffness: 50, damping: 30 });

  // Transform values for different parallax layers
  const textX = useTransform(dampenedX, [-0.5, 0.5], [20, -20]);
  const textY = useTransform(dampenedY, [-0.5, 0.5], [10, -10]);

  const bgX = useTransform(dampenedX, [-0.5, 0.5], [10, -10]);
  const bgY = useTransform(dampenedY, [-0.5, 0.5], [5, -5]);

  // Handle mouse movement and update motion values
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const { left, top, width, height } = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - left) / width - 0.5; // Normalize to -0.5 to 0.5
      const y = (e.clientY - top) / height - 0.5; // Normalize to -0.5 to 0.5

      mouseX.set(x);
      mouseY.set(y);
    }
  };

  // Reset parallax effect on mouse leave
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      className="relative isolate overflow-hidden"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background image with parallax effect */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={{ x: bgX, y: bgY }}
      >
        <div
          className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/80 to-white"
        >
          <Image
            src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
            alt="Hero background"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 100vw"
            priority
            quality={85}
            className="object-cover mix-blend-overlay"
            loading="eager"
          />
        </div>
      </motion.div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 -z-5">
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gold-20"
            style={{
              width: Math.random() * 10 + 5 + "px",
              height: Math.random() * 10 + 5 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              opacity: Math.random() * 0.4 + 0.1,
            }}
            animate={{
              y: [0, Math.random() * 30 - 15],
              opacity: [Math.random() * 0.2 + 0.1, Math.random() * 0.4 + 0.2],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        ))}
      </div>

      <div className="mx-auto max-w-7xl px-6 py-32 lg:py-40 relative z-10">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          style={{ x: textX, y: textY }}
        >
          <motion.h1
            className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span className="text-gold">Unleash</span> Your Potential
          </motion.h1>

          <motion.p
            className="mt-6 text-lg leading-8 text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            VersaTalent connects exceptional individuals with premier opportunities
            across the entertainment, culinary, and sports industries. We represent
            and nurture talent to help them achieve their fullest potential.
          </motion.p>

          <motion.div
            className="mt-10 flex items-center justify-center gap-x-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Button asChild className="bg-gold hover:bg-gold-80 text-white">
              <Link href="/talents">Discover Our Talent</Link>
            </Button>
            <Button asChild variant="outline" className="border-gold text-gold hover:bg-gold-10">
              <Link href="/join.html">Join VersaTalent</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
