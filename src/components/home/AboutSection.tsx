"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ScrollAnimation } from "@/components/ui/scroll-animation";

export function AboutSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <ScrollAnimation animation="fadeInLeft">
              <h2 className="text-3xl font-bold text-foreground mb-6">
                About <span className="text-gold">VersaTalent</span>
              </h2>
              <p className="text-gray-600 mb-6">
                VersaTalent is a premier talent agency founded in 2023 with a mission to connect exceptional talent with meaningful opportunities across multiple industries.
              </p>
              <p className="text-gray-600 mb-6">
                We pride ourselves on our personalized approach, working closely with each artist to understand their unique goals and craft a career path that aligns with their vision.
              </p>
              <p className="text-gray-600 mb-8">
                Our team has deep industry relationships and a proven track record of placing talent in high-profile projects while nurturing emerging artists on their journey to success.
              </p>
              <div className="transition-transform hover:scale-105 duration-300">
                <Button
                  asChild
                  variant="outline"
                  className="border-gold text-gold hover:bg-gold hover:text-white"
                >
                  <Link href="/about">
                    Learn More About Us
                  </Link>
                </Button>
              </div>
            </ScrollAnimation>
          </div>

          <div className="relative order-1 lg:order-2 h-[400px] lg:h-[500px]">
            <ScrollAnimation
              animation="fadeInRight"
            >
              <div className="relative z-10 h-full w-full">
                <Image
                  src="https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                  alt="VersaTalent Team"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                  quality={80}
                  className="object-cover rounded-lg shadow-lg"
                  loading="lazy"
                />
              </div>
            </ScrollAnimation>

            {/* Decorative elements */}
            <ScrollAnimation
              className="absolute -bottom-4 -right-4 h-full w-full border-2 border-gold rounded-lg z-0"
              animation="fadeInRight"
              delay={0.2}
            />
            <ScrollAnimation
              className="absolute -top-4 -left-4 h-1/2 w-1/2 border-2 border-gold rounded-lg z-0"
              animation="fadeInLeft"
              delay={0.3}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
