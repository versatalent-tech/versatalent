"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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

export function Header() {
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

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-6 w-6" aria-hidden="true" />
                <span className="sr-only">Open main menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full bg-background border-l border-gray-200"
            >
              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-gray-200">
                  <div className="space-y-2 py-6">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-foreground hover:bg-gold-10 hover:text-gold"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                  <div className="py-6">
                    <Link
                      href="/contact.html"
                      onClick={() => setMobileMenuOpen(false)}
                      className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gold hover:bg-gold-10"
                    >
                      Get in touch
                    </Link>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
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
    </header>
  );
}
