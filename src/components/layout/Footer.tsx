"use client";

import Link from "next/link";
import Image from "next/image";
import { Instagram, Twitter, Facebook, Linkedin, Mail, Phone } from "lucide-react";

const navigation = {
  main: [
    { name: "Home", href: "/" },
    { name: "About Us", href: "/about" },
    { name: "Talent Directory", href: "/talents" },
    { name: "Join Us", href: "/join" },
    { name: "For Brands", href: "/for-brands" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "/contact" },
  ],
  industries: [
    { name: "Acting", href: "/talents?industry=acting" },
    { name: "Modeling", href: "/talents?industry=modeling" },
    { name: "Music", href: "/talents?industry=music" },
    { name: "Culinary Arts", href: "/talents?industry=culinary" },
    { name: "Sports", href: "/talents?industry=sports" },
  ],
  social: [
    {
      name: "Instagram",
      href: "https://instagram.com/versatalent",
      icon: Instagram,
    },
    {
      name: "Twitter",
      href: "https://twitter.com/versatalent",
      icon: Twitter,
    },
    {
      name: "Facebook",
      href: "https://facebook.com/versatalent",
      icon: Facebook,
    },
    {
      name: "LinkedIn",
      href: "https://linkedin.com/company/versatalent",
      icon: Linkedin,
    },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gray-50">
      <div className="mx-auto max-w-7xl overflow-hidden px-6 py-12 sm:py-16 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between mb-8">
          <div className="mb-8 md:mb-0">
            <Link href="/" className="flex items-center">
              <div className="relative h-16 w-16 mr-3">
                <Image
                  src="/images/versatalent-new-logo.png"
                  alt="VersaTalent Logo"
                  fill
                  sizes="(max-width: 768px) 64px, 64px"
                  quality={90}
                  className="object-contain"
                />
              </div>
            </Link>
            <p className="mt-4 text-sm leading-6 text-gray-600 max-w-md">
              Representing exceptional talent across various industries. We connect talented individuals with opportunities that showcase their unique abilities.
            </p>
            <div className="mt-4 flex space-x-4 text-gray-600">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-gold" />
                <a href="mailto:versatalent.management@gmail.com" className="text-sm hover:text-gold">
                  versatalent.management@gmail.com
                </a>
              </div>
            </div>
            <div className="mt-2 flex space-x-4 text-gray-600">
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-gold" />
                <a href="tel:+1234567890" className="text-sm hover:text-gold">
                  +1 (234) 567-890
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold leading-6 text-gold">Navigation</h3>
              <ul className="mt-2 space-y-2">
                {navigation.main.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-sm leading-6 text-gray-600 hover:text-gold">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-6 text-gold">Industries</h3>
              <ul className="mt-2 space-y-2">
                {navigation.industries.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-sm leading-6 text-gray-600 hover:text-gold">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="flex items-center justify-between">
            <p className="text-xs leading-5 text-gray-500">
              &copy; {new Date().getFullYear()} VersaTalent. All rights reserved.
            </p>
            <div className="flex space-x-4">
              {navigation.social.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-500 hover:text-gold"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
