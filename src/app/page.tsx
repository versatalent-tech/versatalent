import type { Metadata } from "next";
import Link from "next/link";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { FeaturedTalents } from "@/components/home/FeaturedTalents";
import { CTASection } from "@/components/home/CTASection";
import { FAQ } from "@/components/home/FAQ";
import { SocialFeed } from "@/components/home/SocialFeed";
import { DynamicInstagramFeed } from "@/components/home/DynamicInstagramFeed";
import { MainLayout } from "@/components/layout/MainLayout";

export const metadata: Metadata = {
  title: "VersaTalent | Premier Talent Agency Leeds UK - Artist Management & Creative Representation",
  description: "VersaTalent is a leading talent agency in Leeds, UK, representing exceptional artists, models, musicians, and creators. Professional talent management and creative representation services.",
  keywords: "talent agency Leeds, artist management UK, creative representation, talent agency UK, model agency Leeds, music talent management, acting representation Leeds",
};

export default function Home() {
  return (
    <MainLayout>
      {/* Enhanced Hero Section with Animation */}
      <section className="relative bg-gradient-to-br from-white via-gray-50 to-gold-10 py-20 md:py-32 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {/* Subtle gradient animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-gold/5 via-transparent to-gold/10 animate-pulse"></div>

          {/* Floating creative elements */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-gold/10 rounded-full blur-3xl animate-bounce" style={{animationDelay: '0s', animationDuration: '6s'}}></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 bg-gold/20 rounded-full blur-2xl animate-bounce" style={{animationDelay: '2s', animationDuration: '8s'}}></div>
          <div className="absolute top-1/2 right-10 w-16 h-16 bg-gold/15 rounded-full blur-xl animate-bounce" style={{animationDelay: '4s', animationDuration: '7s'}}></div>

          {/* Faint silhouettes/creative shapes */}
          <div className="absolute top-1/4 left-1/4 opacity-5">
            <svg width="100" height="100" viewBox="0 0 100 100" className="animate-spin" style={{animationDuration: '20s'}}>
              <circle cx="50" cy="50" r="40" fill="currentColor" className="text-gold" />
            </svg>
          </div>
          <div className="absolute bottom-1/4 right-1/3 opacity-10">
            <svg width="60" height="60" viewBox="0 0 60 60" className="animate-pulse">
              <polygon points="30,5 55,50 5,50" fill="currentColor" className="text-gold" />
            </svg>
          </div>
        </div>

        <div className="container px-4 mx-auto text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              VersaTalent: Where talent meets{" "}
              <span className="text-gold">opportunity</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              Empowering artists, creators, and innovators to unleash their full potential.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <a
                href="/join.html"
                className="inline-block bg-gold hover:bg-gold/90 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 shadow-lg"
              >
                Join as Talent
              </a>
              <a
                href="/for-brands"
                className="inline-block border-2 border-gold text-gold px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gold hover:text-white transition-all hover:scale-105"
              >
                Book Our Talent
              </a>
            </div>
            {/* Enhanced Reassurance subtext */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm bg-white/50 backdrop-blur-sm rounded-lg p-4 mt-4">
              <span className="flex items-center justify-center text-gray-700 font-medium">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
                Application takes only 2 minutes
              </span>
              <span className="flex items-center justify-center text-gray-700 font-medium">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                </svg>
                48-hour response guarantee
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <UpcomingEvents />

      {/* Featured Talents */}
      <FeaturedTalents />

      {/* VersaTalent in Action (renamed from Recent Highlights) */}
      <section className="py-16 bg-gray-50">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              VersaTalent in <span className="text-gold">Action</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our talent in action - recent projects, performances, and collaborations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <img
                src="/deejaywg/IMG_8976.jpg"
                alt="Deejay WG Live Performance"
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">Festival Performance</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Oct 2024</span>
                </div>
                <p className="text-gray-600 text-sm">Deejay WG headlining at summer music festival</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <img
                src="/jessicadias/IMG_9193-altered.jpg"
                alt="Jessica Dias Fashion Shoot"
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">Fashion Campaign</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Sep 2024</span>
                </div>
                <p className="text-gray-600 text-sm">Jessica Dias in summer collection photoshoot</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <img
                src="/antoniomonteiro/Tonecas_3.jpg"
                alt="Antonio Monteiro Match Action"
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">Match Performance</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Oct 2024</span>
                </div>
                <p className="text-gray-600 text-sm">Antonio Monteiro in competitive action</p>
              </div>
            </div>
          </div>

          {/* See All Highlights CTA */}
          <div className="text-center mt-12">
            <Link
              href="/events"
              className="inline-block border-2 border-gold text-gold px-8 py-3 rounded-lg font-semibold hover:bg-gold hover:text-white transition-all"
            >
              See All Highlights
            </Link>
          </div>
        </div>
      </section>

      {/* Dynamic Instagram Feed */}
      <DynamicInstagramFeed />

      {/* OLD STATIC SECTION - REMOVE LATER */}
      <section className="py-16 bg-white hidden">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Follow Our <span className="text-gold">Artists</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
              Stay connected with our talent and see their latest projects and achievements
            </p>
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <span className="text-sm">Latest from Instagram</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Deejay WG Post */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img src="/deejaywg/IMG_8999.jpg" alt="Deejay WG" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Deejay WG</h3>
                  <p className="text-xs text-gray-500">@deejaywg_</p>
                </div>
                <div className="text-xs text-gray-400">2 hours ago</div>
              </div>
              <div className="aspect-square overflow-hidden">
                <img src="/deejaywg/IMG_8976.jpg" alt="Studio vibes" className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-sm text-gray-700">♥ 1.2k</span>
                  <span className="text-sm text-gray-700">💬 89</span>
                </div>
                <div className="text-sm text-gray-800">
                  <span className="font-semibold">Deejay WG</span> Studio vibes tonight 🎵 Working on something special for you all! #MusicProducer #StudioLife
                </div>
              </div>
            </div>

            {/* Jessica Dias Post */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img src="/jessicadias/IMG_9288-altered.jpg" alt="Jessica Dias" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Jessica Dias</h3>
                  <p className="text-xs text-gray-500">@miss_chocolatinha</p>
                </div>
                <div className="text-xs text-gray-400">5 hours ago</div>
              </div>
              <div className="aspect-square overflow-hidden">
                <img src="/jessicadias/IMG_9214-altered.jpg" alt="Fashion shoot" className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-sm text-gray-700">♥ 2.1k</span>
                  <span className="text-sm text-gray-700">💬 143</span>
                </div>
                <div className="text-sm text-gray-800">
                  <span className="font-semibold">Jessica Dias</span> Behind the scenes of today's fashion shoot ✨ Grateful for amazing teams! #BehindTheScenes #FashionShoot
                </div>
              </div>
            </div>

            {/* João Rodolfo Post */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img src="/joaorodolfo/billboard.PNG" alt="João Rodolfo" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">João Rodolfo</h3>
                  <p className="text-xs text-gray-500">@joaorodolfo_official</p>
                </div>
                <div className="text-xs text-gray-400">1 day ago</div>
              </div>
              <div className="aspect-square overflow-hidden">
                <img src="/joaorodolfo/camera.PNG" alt="Cultural performance" className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-sm text-gray-700">♥ 892</span>
                  <span className="text-sm text-gray-700">💬 67</span>
                </div>
                <div className="text-sm text-gray-800">
                  <span className="font-semibold">João Rodolfo</span> Rehearsing for the cultural night performance 🇬🇼 Bringing Guiné-Bissau to Leeds! #GuinéBissau #CulturalNight
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-lg p-8 max-w-2xl mx-auto text-white">
              <h3 className="text-2xl font-bold mb-3">Follow Our Artists</h3>
              <p className="text-lg opacity-90 mb-6">
                Stay updated with their latest projects and behind-the-scenes content
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <a
                  href="https://instagram.com/deejaywg_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/30 transition-all cursor-pointer"
                >
                  @deejaywg_
                </a>
                <a
                  href="https://instagram.com/miss_chocolatinha"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/30 transition-all cursor-pointer"
                >
                  @miss_chocolatinha
                </a>
                <a
                  href="https://instagram.com/joaorodolfo_official"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/30 transition-all cursor-pointer"
                >
                  @joaorodolfo_official
                </a>
                <a
                  href="https://instagram.com/antoniolaflare98"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/30 transition-all cursor-pointer"
                >
                  @antoniolaflare98
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Story Section with Background Visual */}
      <section className="py-16 bg-white relative overflow-hidden">
        {/* Background Visual */}
        <div className="absolute inset-0">
          {/* Blurred city skyline effect */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-gray-300 to-transparent"></div>
            <div className="absolute bottom-16 left-10 w-8 h-32 bg-gray-400 opacity-30"></div>
            <div className="absolute bottom-16 left-20 w-6 h-40 bg-gray-400 opacity-20"></div>
            <div className="absolute bottom-16 left-28 w-10 h-28 bg-gray-400 opacity-25"></div>
            <div className="absolute bottom-16 left-40 w-4 h-36 bg-gray-400 opacity-15"></div>
            <div className="absolute bottom-16 right-40 w-12 h-44 bg-gray-400 opacity-30"></div>
            <div className="absolute bottom-16 right-28 w-8 h-32 bg-gray-400 opacity-20"></div>
            <div className="absolute bottom-16 right-16 w-6 h-38 bg-gray-400 opacity-25"></div>
            <div className="absolute bottom-16 right-8 w-10 h-30 bg-gray-400 opacity-15"></div>
          </div>

          {/* Subtle event moment silhouettes */}
          <div className="absolute top-20 right-20 opacity-10">
            <svg width="120" height="80" viewBox="0 0 120 80" className="text-gold">
              <circle cx="20" cy="40" r="8" fill="currentColor" />
              <circle cx="40" cy="35" r="6" fill="currentColor" />
              <circle cx="60" cy="42" r="7" fill="currentColor" />
              <circle cx="80" cy="38" r="5" fill="currentColor" />
              <circle cx="100" cy="40" r="6" fill="currentColor" />
            </svg>
          </div>
        </div>

        <div className="container px-4 mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
              Our <span className="text-gold">Story</span>
            </h2>
            <div className="text-lg text-gray-600 leading-relaxed space-y-6">
              <p>
                VersaTalent was founded to give creatives the platform, training, and connections they need to grow into global professionals. We believe that exceptional talent deserves exceptional opportunities.
              </p>
              <p>
                In a world where talent is abundant but opportunities can be scarce, we bridge that gap. Our mission is to identify, nurture, and represent the next generation of artists, performers, and creators who will shape the future of entertainment and beyond.
              </p>
              <p>
                From emerging artists to established professionals, we provide personalized career guidance, industry connections, and the support needed to turn passion into success. Every artist in our roster has a unique story, and we're here to help them write their next chapter.
              </p>
            </div>
            <div className="mt-10">
              <a
                href="/about"
                className="inline-block border-2 border-gold text-gold px-8 py-3 rounded-lg font-semibold hover:bg-gold hover:text-white transition-all"
              >
                Learn More About Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Industries Covered */}
      <section className="py-16 bg-gray-50">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Industries <span className="text-gold">Covered</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              VersaTalent represents exceptional individuals across a diverse range of creative and performance industries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🎭</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Acting</h3>
              <p className="text-gray-600">From commercial actors to dramatic performers, we represent talent for film, television, and theater.</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📸</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Modeling</h3>
              <p className="text-gray-600">Our models work with fashion brands, commercial campaigns, and editorial publications worldwide.</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🎵</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Music</h3>
              <p className="text-gray-600">Singer-songwriters, producers, and musicians who create captivating sonic experiences.</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🍳</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Culinary Arts</h3>
              <p className="text-gray-600">Innovative chefs and culinary creators defining the future of food experiences.</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🏆</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Sports</h3>
              <p className="text-gray-600">Athletes who excel in their disciplines and represent brands with professionalism.</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">More</h3>
              <p className="text-gray-600">We're always open to representing exceptional talent from emerging creative fields.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - Direct Implementation */}
      <section className="py-16 bg-gray-50">
        <div className="container px-4 mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Frequently Asked <span className="text-gold">Questions</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Everything you need to know about joining VersaTalent or booking our exceptional artists
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* For Talent Column */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-foreground mb-6 text-center">For Talent</h3>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-foreground mb-3">How do I apply to join VersaTalent?</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Getting started is simple! Click on "Join as Talent" and complete our 2-minute application form. We'll review your submission and respond within 48 hours.
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-foreground mb-3">What industries does VersaTalent represent?</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    We represent talent across multiple industries including acting, modeling, music, sports, culinary arts, and emerging creative fields.
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-foreground mb-3">Do I need professional experience?</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    While professional experience is valued, we also welcome emerging talent with potential. We look for individuals who are passionate, dedicated, and ready to grow.
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-foreground mb-3">How much does it cost to join?</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    There are no upfront fees to join VersaTalent. We operate on a commission basis, only earning when you do.
                  </p>
                </div>
              </div>

              {/* For Clients Column */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-foreground mb-6 text-center">For Clients</h3>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-foreground mb-3">How can I book VersaTalent artists?</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Contact us through our "Book Our Talent" page or call us directly. We'll discuss your project requirements and match you with the perfect artist.
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-foreground mb-3">What types of projects do your artists work on?</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Our artists work on commercial campaigns, fashion shoots, music productions, live performances, corporate events, film and TV projects, and more.
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-foreground mb-3">How far in advance should I book?</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    We recommend booking 2-4 weeks in advance for most projects, though we can often accommodate shorter notice requests.
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-foreground mb-3">Do you work internationally?</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Yes! Our artists are available for international projects. We handle travel coordination, work permits, and logistics.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mt-12 p-8 bg-white rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-foreground mb-3">Still have questions?</h3>
              <p className="text-gray-600 mb-6">Our team is here to help. Get in touch and we'll respond within 48 hours.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact.html"
                  className="inline-block bg-gold hover:bg-gold/90 text-white px-8 py-3 rounded-lg font-semibold transition-all"
                >
                  Contact Us
                </Link>
                <Link
                  href="/join.html"
                  className="inline-block border-2 border-gold text-gold px-8 py-3 rounded-lg font-semibold hover:bg-gold hover:text-white transition-all"
                >
                  Apply Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Streamlined CTA Section */}
      <CTASection />

      {/* Quick Contact Flow */}
      <section className="py-16 bg-gold text-white">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Whether you're looking for exceptional talent or want to join our roster, we're here to help you succeed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact.html"
              className="inline-block bg-white text-gold px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all"
            >
              Contact Us
            </a>
            <a
              href="/join.html"
              className="inline-block border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-gold transition-all"
            >
              Apply Now
            </a>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
