"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle
} from "lucide-react";

export default function ContactPage() {
  const [formType, setFormType] = useState<'contact' | 'talent' | 'brand'>('contact');

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-20 md:py-32">
        <div className="container px-4 mx-auto text-center">
          <motion.h1
            className="text-4xl md:text-6xl font-bold text-white mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Get in <span className="text-gold">Touch</span>
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Ready to work with exceptional talent or join our roster? Let's start the conversation.
          </motion.p>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 bg-white">
        <div className="container px-4 mx-auto">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Information */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl font-bold text-foreground mb-8">
                  Contact Information
                </h2>

                <div className="space-y-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center">
                      <Mail className="h-6 w-6 text-gold" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Email</h3>
                      <p className="text-gray-600">versatalent.management@gmail.com</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center">
                      <Phone className="h-6 w-6 text-gold" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Phone</h3>
                      <p className="text-gray-600">+44 7714688007</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-gold" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Location</h3>
                      <p className="text-gray-600">Leeds, United Kingdom</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center">
                      <Clock className="h-6 w-6 text-gold" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Response Time</h3>
                      <p className="text-gray-600">Within 48 hours</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-foreground mb-4">Why Choose VersaTalent?</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Professional representation across multiple industries
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Personalized career guidance and development
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Extensive industry connections and opportunities
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      No upfront fees - we succeed when you succeed
                    </li>
                  </ul>
                </div>
              </motion.div>

              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
                  {/* Form Type Selector */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      What can we help you with?
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setFormType('contact')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          formType === 'contact'
                            ? 'bg-gold text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        General Inquiry
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormType('talent')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          formType === 'talent'
                            ? 'bg-gold text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Join as Talent
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormType('brand')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          formType === 'brand'
                            ? 'bg-gold text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Book Our Talent
                      </button>
                    </div>
                  </div>

                  {/* General Contact Form */}
                  <form
                    name="versatalent-contact"
                    method="POST"
                    data-netlify="true"
                    data-netlify-honeypot="bot-field"
                    style={{ display: formType === 'contact' ? 'block' : 'none' }}
                  >
                    <input type="hidden" name="form-name" value="versatalent-contact" />
                    <p style={{ display: 'none' }}>
                      <label>
                        Don't fill this out if you're human: <input name="bot-field" />
                      </label>
                    </p>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input name="firstName" placeholder="First Name" required />
                        <Input name="lastName" placeholder="Last Name" required />
                      </div>
                      <Input name="email" type="email" placeholder="Email" required />
                      <Input name="phone" type="tel" placeholder="Phone" />
                      <Input name="subject" placeholder="Subject" required />
                      <Textarea name="message" placeholder="Message" rows={5} required />
                      <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white">
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                    </div>
                  </form>

                  {/* Talent Application Form */}
                  <form
                    name="versatalent-talent"
                    method="POST"
                    data-netlify="true"
                    data-netlify-honeypot="bot-field"
                    style={{ display: formType === 'talent' ? 'block' : 'none' }}
                  >
                    <input type="hidden" name="form-name" value="versatalent-talent" />
                    <p style={{ display: 'none' }}>
                      <label>
                        Don't fill this out if you're human: <input name="bot-field" />
                      </label>
                    </p>

                    <div className="space-y-6">
                      <Input name="name" placeholder="Full Name" required />
                      <Input name="email" type="email" placeholder="Email" required />
                      <Input name="phone" type="tel" placeholder="Phone" />
                      <Input name="industry" placeholder="Industry (e.g., Music, Modeling)" required />
                      <Textarea name="experience" placeholder="Briefly describe your experience..." rows={3} required />
                      <Input name="portfolioLink" type="url" placeholder="Portfolio Link (Optional)" />
                      <Textarea name="message" placeholder="Why do you want to join VersaTalent?" rows={4} required />
                      <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white">
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                    </div>
                  </form>

                  {/* Brand Partnership Form */}
                  <form
                    name="versatalent-brand"
                    method="POST"
                    data-netlify="true"
                    data-netlify-honeypot="bot-field"
                    style={{ display: formType === 'brand' ? 'block' : 'none' }}
                  >
                    <input type="hidden" name="form-name" value="versatalent-brand" />
                    <p style={{ display: 'none' }}>
                      <label>
                        Don't fill this out if you're human: <input name="bot-field" />
                      </label>
                    </p>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input name="firstName" placeholder="First Name" required />
                        <Input name="lastName" placeholder="Last Name" required />
                      </div>
                      <Input name="email" type="email" placeholder="Email" required />
                      <Input name="phone" type="tel" placeholder="Phone" />
                      <Input name="company" placeholder="Company Name" required />
                      <Input name="subject" placeholder="Subject" required />
                      <Textarea name="message" placeholder="Describe your project and talent needs..." rows={5} required />
                      <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white">
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                    </div>
                  </form>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    We'll respond within 48 hours. Your information is kept confidential.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="container px-4 mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-8">
              Quick <span className="text-gold">Answers</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="font-semibold text-foreground mb-3">Response Time</h3>
                <p className="text-gray-600 text-sm">
                  We respond to all inquiries within 48 hours during business days.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="font-semibold text-foreground mb-3">Application Process</h3>
                <p className="text-gray-600 text-sm">
                  Talent applications are reviewed within 1 week, with next steps communicated promptly.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="font-semibold text-foreground mb-3">Booking Timeline</h3>
                <p className="text-gray-600 text-sm">
                  We recommend booking talent 2-4 weeks in advance for optimal availability.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="font-semibold text-foreground mb-3">Confidentiality</h3>
                <p className="text-gray-600 text-sm">
                  All inquiries and information shared are kept strictly confidential.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
