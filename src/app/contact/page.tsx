"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  User,
  Building,
  MessageSquare,
  CheckCircle
} from "lucide-react";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formType, setFormType] = useState<'contact' | 'talent' | 'brand'>('contact');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(Object.fromEntries(formData)).toString(),
      });

      if (response.ok) {
        setIsSubmitted(true);
        (e.target as HTMLFormElement).reset();
      } else {
        throw new Error('Form submission failed');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('There was an error submitting your form. Please try again or contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <motion.div
            className="text-center max-w-md mx-auto p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Thank You!
            </h1>
            <p className="text-gray-600 mb-6">
              Your message has been sent successfully. We'll get back to you within 48 hours.
            </p>
            <Button
              onClick={() => {
                setIsSubmitted(false);
                setFormType('contact');
              }}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              Send Another Message
            </Button>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

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
                      <p className="text-gray-600">+44 (0) 113 123 4567</p>
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

                  {/* Contact Form */}
                  <form
                    name={`versatalent-${formType}`}
                    method="POST"
                    netlify
                    data-netlify-honeypot="bot-field"
                    onSubmit={handleSubmit}
                    className="space-y-6"
                  >
                    {/* Hidden fields for Netlify */}
                    <input type="hidden" name="form-name" value={`versatalent-${formType}`} />
                    <input type="hidden" name="bot-field" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                          First Name *
                        </label>
                        <Input
                          id="firstName"
                          name="firstName"
                          type="text"
                          required
                          className="w-full"
                          placeholder="Your first name"
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name *
                        </label>
                        <Input
                          id="lastName"
                          name="lastName"
                          type="text"
                          required
                          className="w-full"
                          placeholder="Your last name"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="w-full"
                        placeholder="your.email@example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        className="w-full"
                        placeholder="+44 (0) 123 456 7890"
                      />
                    </div>

                    {formType === 'talent' && (
                      <div>
                        <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                          Industry/Field *
                        </label>
                        <Input
                          id="industry"
                          name="industry"
                          type="text"
                          required
                          className="w-full"
                          placeholder="e.g., Music, Modeling, Acting, Sports, etc."
                        />
                      </div>
                    )}

                    {formType === 'brand' && (
                      <div>
                        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                          Company/Organization *
                        </label>
                        <Input
                          id="company"
                          name="company"
                          type="text"
                          required
                          className="w-full"
                          placeholder="Your company name"
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        Subject *
                      </label>
                      <Input
                        id="subject"
                        name="subject"
                        type="text"
                        required
                        className="w-full"
                        placeholder={
                          formType === 'talent'
                            ? "Application for talent representation"
                            : formType === 'brand'
                            ? "Talent booking inquiry"
                            : "Brief subject of your inquiry"
                        }
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                        Message *
                      </label>
                      <Textarea
                        id="message"
                        name="message"
                        required
                        rows={5}
                        className="w-full"
                        placeholder={
                          formType === 'talent'
                            ? "Tell us about your background, experience, and what you're looking for in representation..."
                            : formType === 'brand'
                            ? "Describe your project, timeline, budget, and the type of talent you're seeking..."
                            : "Please provide details about your inquiry..."
                        }
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gold hover:bg-gold/90 text-white"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                      We'll respond to your inquiry within 48 hours. Your information is kept confidential.
                    </p>
                  </form>
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
