"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function JoinPage() {
  return (
    <MainLayout>
      <div className="bg-black py-16 md:py-24">
        <div className="container px-4 mx-auto">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-2">Join <span className="text-gold">VersaTalent</span></h1>
            <p className="text-xl text-gray-300 mb-10">
              We're always looking for exceptional talent to join our roster.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">What We Look For</h2>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <div className="mr-3 mt-1 text-gold">•</div>
                    <p className="text-gray-300">Dedication to your craft and a professional attitude</p>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-3 mt-1 text-gold">•</div>
                    <p className="text-gray-300">Unique talents and perspectives that stand out</p>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-3 mt-1 text-gold">•</div>
                    <p className="text-gray-300">Authenticity and a strong personal brand</p>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-3 mt-1 text-gold">•</div>
                    <p className="text-gray-300">Willingness to collaborate and take direction</p>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-3 mt-1 text-gold">•</div>
                    <p className="text-gray-300">A portfolio or examples of your work</p>
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Industries We Represent</h2>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-gold/20 hover:bg-gold/30 text-gold border-none px-3 py-1.5">
                    Acting
                  </Badge>
                  <Badge className="bg-gold/20 hover:bg-gold/30 text-gold border-none px-3 py-1.5">
                    Modeling
                  </Badge>
                  <Badge className="bg-gold/20 hover:bg-gold/30 text-gold border-none px-3 py-1.5">
                    Music
                  </Badge>
                  <Badge className="bg-gold/20 hover:bg-gold/30 text-gold border-none px-3 py-1.5">
                    Culinary Arts
                  </Badge>
                  <Badge className="bg-gold/20 hover:bg-gold/30 text-gold border-none px-3 py-1.5">
                    Sports
                  </Badge>
                </div>

                <p className="mt-6 text-gray-300">
                  Don't see your specific talent listed? We're always open to expanding our roster with exceptional individuals from various fields. Tell us about your unique abilities!
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 p-8 rounded-lg border border-zinc-800">
              <h2 className="text-2xl font-semibold text-white mb-6">Application Form</h2>

              <form
                name="versatalent-talent"
                method="POST"
                data-netlify="true"
                data-netlify-honeypot="bot-field"
                className="space-y-6"
              >
                <input type="hidden" name="form-name" value="versatalent-talent" />
                <p style={{ display: 'none' }}>
                  <label>
                    Don't fill this out if you're human: <input name="bot-field" />
                  </label>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white mb-2 text-sm font-medium">Full Name *</label>
                    <Input
                      name="name"
                      placeholder="Your full name"
                      className="bg-zinc-800 border-zinc-700 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white mb-2 text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      name="email"
                      placeholder="your.email@example.com"
                      className="bg-zinc-800 border-zinc-700 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white mb-2 text-sm font-medium">Phone Number *</label>
                    <Input
                      type="tel"
                      name="phone"
                      placeholder="Your phone number"
                      className="bg-zinc-800 border-zinc-700 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white mb-2 text-sm font-medium">Industry *</label>
                    <select
                      name="industry"
                      className="w-full h-10 px-3 rounded-md bg-zinc-800 border border-zinc-700 text-white"
                      required
                    >
                      <option value="">Select your industry</option>
                      <option value="acting">Acting</option>
                      <option value="modeling">Modeling</option>
                      <option value="music">Music</option>
                      <option value="culinary">Culinary Arts</option>
                      <option value="sports">Sports</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm font-medium">Experience *</label>
                  <Textarea
                    name="experience"
                    placeholder="Briefly describe your experience in your industry"
                    className="bg-zinc-800 border-zinc-700 min-h-24 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm font-medium">Portfolio Link (Optional)</label>
                  <Input
                    type="url"
                    name="portfolioLink"
                    placeholder="Link to your website, Instagram, YouTube, etc."
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm font-medium">Why do you want to join VersaTalent? *</label>
                  <Textarea
                    name="message"
                    placeholder="Tell us why you want to join and what makes you unique"
                    className="bg-zinc-800 border-zinc-700 min-h-24 text-white"
                    required
                  />
                </div>

                <Button type="submit" className="bg-gold hover:bg-gold/90 text-black w-full md:w-auto">
                  Submit Application
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
