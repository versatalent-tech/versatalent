"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import type { Talent } from "@/lib/data/talents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Calendar,
  MapPin,
  Mail,
  Instagram,
  Youtube,
  Music,
  Check
} from "lucide-react";

export default function ArtistProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [talent, setTalent] = useState<Talent | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    async function fetchArtist() {
      try {
        setLoading(true);

        // Try to fetch from talents API first (existing system)
        const response = await fetch(`/api/talents/${params.id}`);

        if (response.ok) {
          const data = await response.json();
          setTalent(data);
        } else {
          // If not found in talents, try NFC users
          const userResponse = await fetch(`/api/nfc/users/${params.id}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            // Convert user data to talent format
            setTalent({
              id: userData.id,
              name: userData.name,
              industry: 'music' as any,
              gender: 'male' as any,
              ageGroup: 'adult' as any,
              profession: 'Artist',
              location: 'Leeds, UK',
              bio: `Professional artist and performer. Member of VersaTalent.`,
              tagline: 'Creating amazing experiences',
              skills: [],
              imageSrc: userData.avatar_url || '/placeholder-artist.jpg',
              featured: false,
              socialLinks: {},
              portfolio: []
            });
          }
        }
      } catch (error) {
        console.error('Error fetching artist:', error);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchArtist();
    }
  }, [params.id]);

  // Check if this visit came from NFC
  useEffect(() => {
    const fromNFC = searchParams.get('from') === 'nfc';
    if (fromNFC && !checkedIn) {
      setCheckedIn(true);
    }
  }, [searchParams, checkedIn]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Loading artist profile...</p>
        </div>
      </MainLayout>
    );
  }

  if (!talent) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Artist Not Found</h1>
            <Link href="/talents" className="text-gold hover:underline">
              Browse all talent
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Success notification for NFC check-in */}
      {checkedIn && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <Check className="h-5 w-5" />
          <span>Check-in successful!</span>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative bg-black">
        <div className="absolute inset-0">
          <Image
            src={talent.imageSrc}
            alt={talent.name}
            fill
            quality={90}
            className="object-cover opacity-40"
            priority
          />
        </div>

        <div className="relative z-10 container px-4 mx-auto py-32">
          <div className="max-w-4xl">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-gold text-white border-none text-sm">
                {talent.industry.charAt(0).toUpperCase() + talent.industry.slice(1)}
              </Badge>
              {talent.featured && (
                <Badge className="bg-red-600 text-white border-none text-sm">
                  Featured Artist
                </Badge>
              )}
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              {talent.name}
            </h1>

            <p className="text-2xl text-gold mb-4">{talent.profession}</p>

            <p className="text-xl text-white/90 max-w-3xl leading-relaxed mb-6">
              {talent.tagline}
            </p>

            <div className="flex items-center gap-2 text-white/80 mb-8">
              <MapPin className="h-5 w-5" />
              <span>{talent.location}</span>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button className="bg-gold hover:bg-gold/90 text-white">
                <Download className="h-4 w-4 mr-2" />
                Download Press Kit
              </Button>
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-black">
                <Mail className="h-4 w-4 mr-2" />
                Book Now
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Bio Section */}
      <section className="py-16 bg-white">
        <div className="container px-4 mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-6">About {talent.name}</h2>
          <div
            className="text-gray-700 leading-relaxed prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: talent.bio }}
          />

          {talent.skills.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Skills & Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {talent.skills.map((skill, index) => (
                  <Badge key={index} variant="outline" className="border-gold text-gold">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {talent.socialLinks && Object.keys(talent.socialLinks).length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Connect</h3>
              <div className="flex gap-4">
                {talent.socialLinks.instagram && (
                  <a
                    href={talent.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gold transition-colors"
                  >
                    <Instagram className="h-6 w-6" />
                  </a>
                )}
                {talent.socialLinks.youtube && (
                  <a
                    href={talent.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gold transition-colors"
                  >
                    <Youtube className="h-6 w-6" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Portfolio Section */}
      {talent.portfolio && talent.portfolio.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container px-4 mx-auto">
            <h2 className="text-3xl font-bold mb-8">Portfolio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {talent.portfolio.slice(0, 6).map((item) => (
                <div key={item.id} className="bg-white rounded-lg overflow-hidden shadow">
                  <div className="relative h-64">
                    {item.type === 'image' ? (
                      <Image
                        src={item.url}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="bg-black h-full flex items-center justify-center">
                        <Music className="h-12 w-12 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                    {item.category && (
                      <p className="text-sm text-gray-500">{item.category}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-gold text-white">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Interested in booking {talent.name}?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Contact us to discuss availability and custom performance packages.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact.html">
              <Button className="bg-white text-gold hover:bg-gray-100">
                <Mail className="h-4 w-4 mr-2" />
                Get in Touch
              </Button>
            </Link>
            <Link href="/for-brands">
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-gold">
                View Booking Info
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
