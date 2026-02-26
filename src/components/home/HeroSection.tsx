"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Handle mouse movement for parallax
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const { left, top, width, height } = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - left) / width - 0.5;
      const y = (e.clientY - top) / height - 0.5;
      setMousePos({ x: x * 20, y: y * 10 });
    }
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  return (
    <div
      className="relative isolate overflow-hidden"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/80 to-white">
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
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 -z-5 overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gold/20 animate-pulse"
            style={{
              width: `${8 + (i % 5) * 2}px`,
              height: `${8 + (i % 5) * 2}px`,
              left: `${(i * 7) % 100}%`,
              top: `${(i * 11) % 100}%`,
              opacity: 0.2 + (i % 3) * 0.1,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${3 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      <div className="mx-auto max-w-7xl px-6 py-32 lg:py-40 relative z-10">
        <div
          className="mx-auto max-w-3xl text-center transition-transform duration-300 ease-out"
          style={{
            transform: `translate(${mousePos.x}px, ${mousePos.y}px)`,
          }}
        >
          <h1
            className={`text-4xl font-bold tracking-tight text-foreground sm:text-6xl mb-4 transition-all duration-700 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
            }`}
          >
            <span className="text-gold">Unleash</span> Your Potential
          </h1>

          <p
            className={`mt-6 text-lg leading-8 text-gray-600 transition-all duration-700 delay-100 ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
          >
            VersaTalent connects exceptional individuals with premier opportunities
            across the entertainment, culinary, and sports industries. We represent
            and nurture talent to help them achieve their fullest potential.
          </p>

          <div
            className={`mt-10 flex items-center justify-center gap-x-6 transition-all duration-700 delay-200 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
            }`}
          >
            <Button asChild className="bg-gold hover:bg-gold/80 text-white">
              <Link href="/talents">Discover Our Talent</Link>
            </Button>
            <Button asChild variant="outline" className="border-gold text-gold hover:bg-gold/10">
              <Link href="/join.html">Join VersaTalent</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
