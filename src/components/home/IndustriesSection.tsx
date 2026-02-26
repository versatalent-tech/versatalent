"use client";

import Link from "next/link";
import { Film, User, Music, Utensils, Trophy } from "lucide-react";

const industries = [
  {
    name: "Acting",
    icon: Film,
    description: "From commercial actors to dramatic performers, we represent talent for film, television, and theater.",
    href: "/talents?industry=acting",
  },
  {
    name: "Modeling",
    icon: User,
    description: "Our models work with fashion brands, commercial campaigns, and editorial publications worldwide.",
    href: "/talents?industry=modeling",
  },
  {
    name: "Music",
    icon: Music,
    description: "Singer-songwriters, producers, and musicians who create captivating sonic experiences.",
    href: "/talents?industry=music",
  },
  {
    name: "Culinary Arts",
    icon: Utensils,
    description: "Innovative chefs and culinary creators defining the future of food experiences.",
    href: "/talents?industry=culinary",
  },
  {
    name: "Sports",
    icon: Trophy,
    description: "Athletes who excel in their disciplines and represent brands with professionalism.",
    href: "/talents?industry=sports",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300 } },
};

export function IndustriesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container px-4 mx-auto">
        <div
          className="flex flex-col items-center mb-16"}}
          transition={{ duration: 0.5 }}}
        >
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Industries <span className="text-gold">Covered</span>
          </h2>
          <div className="h-1 w-20 bg-gold rounded mb-6" />
          <p className="text-gray-600 text-center max-w-2xl">
            VersaTalent represents exceptional individuals across a diverse range of creative and performance industries.
          </p>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial="hidden"}
        >
          {industries.map((industry) => (
            <div
              key={industry.name}}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Link
                href={industry.href}
                className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-gold transition-all duration-300 shadow-sm"
              >
                <div className="flex items-center mb-4">
                  <div className="p-2 rounded-full bg-gold-10 mr-4">
                    <industry.icon className="h-6 w-6 text-gold" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{industry.name}</h3>
                </div>
                <p className="text-gray-600">{industry.description}</p>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
