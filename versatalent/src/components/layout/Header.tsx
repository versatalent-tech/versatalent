"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { Menu, User, LogOut, Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";

const publicNavigation = [
  { name: "Home", href: "/" },
  { name: "About Us", href: "/about" },
  { name: "Talent Directory", href: "/talents" },
  { name: "Events", href: "/events" },
  { name: "Join Us", href: "/join" },
  { name: "For Brands", href: "/for-brands" },
  { name: "Blog", href: "/blog" },
  { name: "Contact", href: "/contact" },
];

const authenticatedNavigation = [
  { name: "Home", href: "/" },
  { name: "About Us", href: "/about" },
  { name: "Talent Directory", href: "/talents" },
  { name: "Events", href: "/events" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Join Us", href: "/join" },
  { name: "For Brands", href: "/for-brands" },
  { name: "Blog", href: "/blog" },
  { name: "Contact", href: "/contact" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, status } = useAuth();

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
                    {(isAuthenticated ? authenticatedNavigation : publicNavigation).map((item) => (
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
                  <div className="py-6 space-y-3">
                    {isAuthenticated ? (
                      <>
                        <div className="flex items-center gap-3 px-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.image || undefined} />
                            <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">{user?.name}</p>
                            <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
                          </div>
                        </div>
                        <Link
                          href="/dashboard"
                          onClick={() => setMobileMenuOpen(false)}
                          className="-mx-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gold hover:bg-gold-10"
                        >
                          <BarChart3 className="h-4 w-4" />
                          Dashboard
                        </Link>
                        <button
                          onClick={() => {
                            setMobileMenuOpen(false);
                            signOut();
                          }}
                          className="-mx-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-red-600 hover:bg-red-50 w-full text-left"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/auth/signin"
                          onClick={() => setMobileMenuOpen(false)}
                          className="-mx-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gold hover:bg-gold-10"
                        >
                          <User className="h-4 w-4" />
                          Sign In
                        </Link>
                        <Link
                          href="/contact"
                          onClick={() => setMobileMenuOpen(false)}
                          className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-foreground hover:bg-gray-50"
                        >
                          Get in touch
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop menu */}
        <div className="hidden lg:flex lg:gap-x-6">
          {(isAuthenticated ? authenticatedNavigation : publicNavigation).map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-semibold leading-6 text-foreground hover:text-gold transition duration-150"
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-4">
          {status === 'loading' ? (
            <div className="animate-pulse">
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            </div>
          ) : isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.image || undefined} alt={user?.name || ''} />
                    <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground capitalize">
                      {user?.role}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                className="text-foreground hover:text-gold"
              >
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-gold text-gold hover:bg-gold hover:text-background"
              >
                <Link href="/contact">Get in touch</Link>
              </Button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
