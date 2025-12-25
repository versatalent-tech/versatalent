import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/MainLayout";

export default function ForBrandsPage() {
  return (
    <MainLayout>
      <div className="bg-black py-16 md:py-24">
        <div className="container px-4 mx-auto">
          {/* Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
            <div>
              <h1 className="text-4xl font-bold text-white mb-4">For <span className="text-gold">Brands</span> & Collaborators</h1>
              <p className="text-xl text-gray-300 mb-8">
                Find the perfect talent for your next campaign, project, or event. VersaTalent connects you with exceptional individuals across various industries.
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-gold/10 mr-4">
                    <svg className="h-5 w-5 text-gold" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-gray-300">Access to a diverse roster of professional talent</p>
                </div>
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-gold/10 mr-4">
                    <svg className="h-5 w-5 text-gold" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-gray-300">Personalized talent matching for your specific needs</p>
                </div>
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-gold/10 mr-4">
                    <svg className="h-5 w-5 text-gold" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-gray-300">Streamlined booking and contract management</p>
                </div>
              </div>
              <div className="mt-10">
                <Button asChild className="bg-gold hover:bg-gold/80 text-black px-8 py-6 text-lg">
                  <Link href="/contact.html">
                    Let's Collaborate
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative h-[400px] lg:h-[500px] rounded-lg overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                alt="Brand collaboration"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40" />
            </div>
          </div>

          {/* Why Choose VersaTalent */}
          <div className="mb-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">Why Choose <span className="text-gold">VersaTalent</span></h2>
              <p className="text-gray-300 max-w-2xl mx-auto">
                We pride ourselves on connecting brands with the perfect talent to bring your vision to life.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-zinc-900/50 p-8 rounded-lg border border-zinc-800">
                <div className="p-3 rounded-full bg-gold/10 w-14 h-14 flex items-center justify-center mb-6">
                  <svg className="h-7 w-7 text-gold" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 20H5V12H19V20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 12V8C16 6.93913 15.5786 5.92172 14.8284 5.17157C14.0783 4.42143 13.0609 4 12 4C10.9391 4 9.92172 4.42143 9.17157 5.17157C8.42143 5.92172 8 6.93913 8 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Vetted Talent</h3>
                <p className="text-gray-300">
                  Every talent on our roster has been professionally vetted to ensure the highest standards of quality and professionalism.
                </p>
              </div>

              <div className="bg-zinc-900/50 p-8 rounded-lg border border-zinc-800">
                <div className="p-3 rounded-full bg-gold/10 w-14 h-14 flex items-center justify-center mb-6">
                  <svg className="h-7 w-7 text-gold" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Industry Expertise</h3>
                <p className="text-gray-300">
                  Our team brings decades of experience across multiple industries, allowing us to provide targeted talent solutions.
                </p>
              </div>

              <div className="bg-zinc-900/50 p-8 rounded-lg border border-zinc-800">
                <div className="p-3 rounded-full bg-gold/10 w-14 h-14 flex items-center justify-center mb-6">
                  <svg className="h-7 w-7 text-gold" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Responsive Service</h3>
                <p className="text-gray-300">
                  From initial inquiry to project completion, our team provides attentive service to ensure your collaboration runs smoothly.
                </p>
              </div>
            </div>
          </div>

          {/* Our Process */}
          <div className="mb-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">Our <span className="text-gold">Process</span></h2>
              <p className="text-gray-300 max-w-2xl mx-auto">
                We make working with top talent simple and effective. Here's how our collaboration process works:
              </p>
            </div>

            <div className="relative">
              {/* Process steps */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gold/20 -translate-x-1/2 z-0" />

              <div className="space-y-12 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="md:text-right">
                    <div className="flex items-center md:justify-end">
                      <span className="bg-gold text-black w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 md:ml-3 md:mr-0 md:order-2">1</span>
                      <h3 className="text-xl font-semibold text-white md:order-1">Consultation</h3>
                    </div>
                    <p className="text-gray-300 mt-3">
                      We begin with a detailed consultation to understand your project needs, goals, and vision.
                    </p>
                  </div>
                  <div className="hidden md:block" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="hidden md:block" />
                  <div>
                    <div className="flex items-center">
                      <span className="bg-gold text-black w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3">2</span>
                      <h3 className="text-xl font-semibold text-white">Talent Matching</h3>
                    </div>
                    <p className="text-gray-300 mt-3">
                      Our team curates a selection of talent that matches your specific requirements and project goals.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="md:text-right">
                    <div className="flex items-center md:justify-end">
                      <span className="bg-gold text-black w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 md:ml-3 md:mr-0 md:order-2">3</span>
                      <h3 className="text-xl font-semibold text-white md:order-1">Proposal & Agreement</h3>
                    </div>
                    <p className="text-gray-300 mt-3">
                      We provide a clear proposal and handle all contract details to ensure a smooth collaboration.
                    </p>
                  </div>
                  <div className="hidden md:block" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="hidden md:block" />
                  <div>
                    <div className="flex items-center">
                      <span className="bg-gold text-black w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3">4</span>
                      <h3 className="text-xl font-semibold text-white">Project Execution</h3>
                    </div>
                    <p className="text-gray-300 mt-3">
                      Our talent delivers exceptional work while our team provides ongoing support throughout the project.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-zinc-900 to-black p-12 rounded-lg border border-gold/20">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to Find Your Perfect Talent?</h2>
              <p className="text-gray-300 mb-8">
                Whether you need actors for a commercial, models for a campaign, chefs for an event, or athletes for brand representation, we have the talent for you.
              </p>
              <Button asChild className="bg-gold hover:bg-gold/80 text-black px-8 py-6 text-lg">
                <Link href="/contact.html">
                  Contact Us Today
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
