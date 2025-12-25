"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Home", href: "/" },
  { name: "About Us", href: "/about" },
  { name: "Talent Directory", href: "/talents" },
  { name: "Events", href: "/events" },
  { name: "Join Us", href: "/join.html" },
  { name: "For Brands", href: "/for-brands" },
  { name: "Blog", href: "/blog" },
  { name: "Contact", href: "/contact.html" },
];

export function SimpleHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed w-full bg-background/80 backdrop-blur-md z-50 border-b border-gray-200 shadow-sm">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
        aria-label="Global"
      >
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="sr-only">VersaTalent</span>
            <div className="flex items-center">
              <div className="relative h-16 w-16">
                <Image
                  src="/images/versatalent-new-logo.png"
                  alt="VersaTalent Logo"
                  fill
                  sizes="(max-width: 768px) 64px, 64px"
                  quality={90}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </Link>
        </div>

        {/* Mobile menu button - simple version without Sheet */}
        <div className="flex lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
            <span className="sr-only">
              {mobileMenuOpen ? "Close menu" : "Open menu"}
            </span>
          </Button>
        </div>

        {/* Desktop menu */}
        <div className="hidden lg:flex lg:gap-x-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-semibold leading-6 text-foreground hover:text-gold transition duration-150"
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <Button
            asChild
            variant="outline"
            className="border-gold text-gold hover:bg-gold hover:text-background"
          >
            <Link href="/contact.html">Get in touch</Link>
          </Button>
        </div>
      </nav>

      {/* Simple mobile menu - no animations */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-background">
          <div className="px-6 py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-semibold text-foreground hover:bg-gold-10 hover:text-gold rounded-lg"
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-200">
              <Link
                href="/contact.html"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-semibold text-gold hover:bg-gold-10 rounded-lg"
              >
                Get in touch
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
