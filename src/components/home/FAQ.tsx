"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'talent' | 'client';
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'How do I apply to join VersaTalent?',
    answer: 'Getting started is simple! Click on "Join as Talent" and complete our 2-minute application form. We\'ll review your submission and respond within 48 hours. We look for passionate individuals with unique skills and professional attitudes across all creative industries.',
    category: 'talent'
  },
  {
    id: '2',
    question: 'What industries does VersaTalent represent?',
    answer: 'We represent talent across multiple industries including acting, modeling, music, sports, culinary arts, and emerging creative fields. If you have exceptional skills and professional drive, we\'d love to hear from you regardless of your specific field.',
    category: 'talent'
  },
  {
    id: '3',
    question: 'Do I need professional experience to join?',
    answer: 'While professional experience is valued, we also welcome emerging talent with potential. We look for individuals who are passionate, dedicated, and ready to grow. Our team provides guidance and opportunities to help develop your career.',
    category: 'talent'
  },
  {
    id: '4',
    question: 'What support does VersaTalent provide to artists?',
    answer: 'We offer comprehensive career management including opportunity sourcing, contract negotiation, career guidance, professional development, and industry networking. Our team works closely with each artist to create personalized growth strategies.',
    category: 'talent'
  },
  {
    id: '5',
    question: 'How much does it cost to join VersaTalent?',
    answer: 'There are no upfront fees to join VersaTalent. We operate on a commission basis, only earning when you do. This ensures we\'re fully invested in your success and actively working to secure the best opportunities for you.',
    category: 'talent'
  },
  {
    id: '6',
    question: 'How can I book VersaTalent artists for my project?',
    answer: 'Contact us through our "Book Our Talent" page or call us directly. We\'ll discuss your project requirements, timeline, and budget to match you with the perfect artist. We handle all logistics, contracts, and coordination.',
    category: 'client'
  },
  {
    id: '7',
    question: 'What types of projects do your artists work on?',
    answer: 'Our artists work on diverse projects including commercial campaigns, fashion shoots, music productions, live performances, corporate events, film and TV projects, sports competitions, and culinary experiences. We cater to both large commercial clients and intimate private events.',
    category: 'client'
  },
  {
    id: '8',
    question: 'How far in advance should I book talent?',
    answer: 'We recommend booking 2-4 weeks in advance for most projects, though we can often accommodate shorter notice requests. For major campaigns or events, 6-8 weeks advance notice ensures the best artist availability and preparation time.',
    category: 'client'
  },
  {
    id: '9',
    question: 'Do you provide talent for international projects?',
    answer: 'Yes! Our artists are available for international projects. We handle travel coordination, work permits, and logistics. Many of our artists have worked across Europe, North America, and other international markets.',
    category: 'client'
  },
  {
    id: '10',
    question: 'What are your rates and how does pricing work?',
    answer: 'Rates vary based on the artist, project scope, duration, and usage rights. We provide transparent, competitive pricing tailored to your budget. Contact us for a detailed quote - we\'re committed to finding solutions that work for both parties.',
    category: 'client'
  }
];

export function FAQ() {
  const [activeTab, setActiveTab] = useState<'talent' | 'client'>('talent');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredFAQs = faqData.filter(faq => faq.category === activeTab);

  return (
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

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <button
                onClick={() => setActiveTab('talent')}
                className={`px-6 py-3 rounded-md font-semibold transition-all ${
                  activeTab === 'talent'
                    ? 'bg-gold text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                For Talent
              </button>
              <button
                onClick={() => setActiveTab('client')}
                className={`px-6 py-3 rounded-md font-semibold transition-all ${
                  activeTab === 'client'
                    ? 'bg-gold text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                For Clients
              </button>
            </div>
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            {filteredFAQs.map((faq, index) => (
              <motion.div
                key={faq.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <button
                  onClick={() => toggleExpanded(faq.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-foreground pr-4">
                    {faq.question}
                  </h3>
                  {expandedId === faq.id ? (
                    <ChevronUpIcon className="h-5 w-5 text-gold flex-shrink-0" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedId === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4">
                        <p className="text-gray-600 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="text-center mt-12 p-8 bg-white rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Still have questions?
            </h3>
            <p className="text-gray-600 mb-6">
              Our team is here to help. Get in touch and we'll respond within 48 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact.html"
                className="inline-block bg-gold hover:bg-gold/90 text-white px-8 py-3 rounded-lg font-semibold transition-all"
              >
                Contact Us
              </a>
              <a
                href={activeTab === 'talent' ? '/join' : '/for-brands'}
                className="inline-block border-2 border-gold text-gold px-8 py-3 rounded-lg font-semibold hover:bg-gold hover:text-white transition-all"
              >
                {activeTab === 'talent' ? 'Apply Now' : 'Book Talent'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
