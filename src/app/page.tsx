import type { Metadata } from "next";
import { FeaturedTalents } from "@/components/home/FeaturedTalents";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { CTASection } from "@/components/home/CTASection";
import { MainLayout } from "@/components/layout/MainLayout";

export const metadata: Metadata = {
  title: "VersaTalent | Premier Talent Agency Leeds UK - Artist Management & Creative Representation",
  description: "VersaTalent is a leading talent agency in Leeds, UK, representing exceptional artists, models, musicians, and creators. Professional talent management and creative representation services.",
  keywords: "talent agency Leeds, artist management UK, creative representation, talent agency UK, model agency Leeds, music talent management, acting representation Leeds",
};

export default function Home() {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-gray-50 to-gold-10 py-20 md:py-32">
        <div className="container px-4 mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              VersaTalent: Where talent meets{" "}
              <span className="text-gold">opportunity</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              Empowering artists, creators, and innovators to unleash their full potential.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/join"
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
          </div>
        </div>
      </section>

      {/* Featured Talents Showcase */}
      <FeaturedTalents />

      {/* VersaTalent Artists Showcase */}
      <section className="py-16 bg-black">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              VersaTalent <span className="text-gold">Artists</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Meet some of our exceptional talent making waves across multiple industries
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group relative overflow-hidden rounded-lg">
              <img
                src="/deejaywg/IMG_8999.jpg"
                alt="Deejay WG - Music Artist"
                className="w-full h-80 object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <h3 className="text-white font-semibold text-lg">Deejay WG</h3>
                <p className="text-gold text-sm">Music Producer & DJ</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-lg">
              <img
                src="/jessicadias/IMG_9288-altered.jpg"
                alt="Jessica Dias - Model"
                className="w-full h-80 object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <h3 className="text-white font-semibold text-lg">Jessica Dias</h3>
                <p className="text-gold text-sm">Professional Model</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-lg">
              <img
                src="/joaorodolfo/JROD_2.jpg"
                alt="Joao Rodolfo - Singer"
                className="w-full h-80 object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <h3 className="text-white font-semibold text-lg">João Rodolfo</h3>
                <p className="text-gold text-sm">Singer-Songwriter</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-lg">
              <img
                src="/antoniomonteiro/Tonecas_1.jpg"
                alt="Antonio Monteiro - Athlete"
                className="w-full h-80 object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <h3 className="text-white font-semibold text-lg">Antonio Monteiro</h3>
                <p className="text-gold text-sm">Professional Footballer</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <a
              href="/talents"
              className="inline-block border-2 border-gold text-gold px-8 py-3 rounded-lg font-semibold hover:bg-gold hover:text-black transition-all"
            >
              View All Talent
            </a>
          </div>
        </div>
      </section>

      {/* Mini Events Gallery */}
      <section className="py-16 bg-gray-50">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Recent <span className="text-gold">Highlights</span>
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
                <h3 className="font-semibold text-lg mb-2">Festival Performance</h3>
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
                <h3 className="font-semibold text-lg mb-2">Fashion Campaign</h3>
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
                <h3 className="font-semibold text-lg mb-2">Match Performance</h3>
                <p className="text-gray-600 text-sm">Antonio Monteiro in competitive action</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 bg-white">
        <div className="container px-4 mx-auto">
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

      {/* Upcoming Events */}
      <UpcomingEvents />

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
              href="/contact"
              className="inline-block bg-white text-gold px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all"
            >
              Contact Us
            </a>
            <a
              href="/join"
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
