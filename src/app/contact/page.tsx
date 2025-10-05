"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, Clock, MapPin, Instagram } from "lucide-react";
import { motion } from "framer-motion";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  subject: z.string().min(2, {
    message: "Subject must be at least 2 characters.",
  }),
  message: z
    .string()
    .min(10, {
      message: "Your message must be at least 10 characters.",
    })
    .max(500, {
      message: "Your message must not exceed 500 characters.",
    }),
});

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ "form-name": "contact", ...values }).toString(),
    })
      .then(() => setIsSubmitted(true))
      .catch((error) => alert(error));
  }

  return (
    <MainLayout>
      <div className="bg-white py-16 md:py-24">
        <div className="container px-4 mx-auto">
          <motion.div
            className="max-w-5xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Get in <span className="text-gold">Touch</span>
              </h1>
              <p className="text-xl text-gray-600">
                We'd love to hear from you. Reach out for collaborations, questions, or to schedule a meeting.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <motion.div
                className="lg:col-span-2"
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
                  <h2 className="text-2xl font-semibold text-foreground mb-6">
                    Send Us a Message
                  </h2>

                  {isSubmitted ? (
                    <motion.div
                      className="text-center py-8"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", duration: 0.5 }}
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold-10 text-gold mb-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          className="w-8 h-8"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <h3 className="text-xl text-foreground mb-2">Message Sent!</h3>
                      <p className="text-gray-600 mb-4">
                        Thank you for contacting VersaTalent. We'll respond to your message within 24-48 business hours.
                      </p>
                      <Button
                        variant="outline"
                        className="border-gold text-gold hover:bg-gold hover:text-white"
                        onClick={() => setIsSubmitted(false)}
                      >
                        Send Another Message
                      </Button>
                    </motion.div>
                  ) : (
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                        name="contact"
                        method="POST"
                        data-netlify="true"
                        netlify-honeypot="bot-field"
                      >
                        <input type="hidden" name="form-name" value="contact" />
                        <input
                          type="hidden"
                          name="subject"
                          value="VersaTalent Contact Form Submission"
                        />
                        <p className="hidden">
                          <label>
                            Don't fill this out if you're human: <input name="bot-field" />
                          </label>
                        </p>
                        <motion.div
                          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                          variants={containerVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                        >
                          <motion.div variants={itemVariants}>
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground">
                                    Name
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Your name"
                                      className="bg-white border-gray-300 focus:border-gold"
                                      {...field}
                                      name="name"
                                      autoComplete="name"
                                    />
                                  </FormControl>
                                  <FormMessage className="text-red-500" />
                                </FormItem>
                              )}
                            />
                          </motion.div>

                          <motion.div variants={itemVariants}>
                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground">
                                    Email
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="your.email@example.com"
                                      className="bg-white border-gray-300 focus:border-gold"
                                      {...field}
                                      name="email"
                                      autoComplete="email"
                                    />
                                  </FormControl>
                                  <FormMessage className="text-red-500" />
                                </FormItem>
                              )}
                            />
                          </motion.div>
                        </motion.div>

                        <motion.div
                          variants={itemVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                        >
                          <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground">
                                  Subject
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="What's this regarding?"
                                    className="bg-white border-gray-300 focus:border-gold"
                                    {...field}
                                    name="subject"
                                  />
                                </FormControl>
                                <FormMessage className="text-red-500" />
                              </FormItem>
                            )}
                          />
                        </motion.div>

                        <motion.div
                          variants={itemVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                        >
                          <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground">
                                  Message
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Tell us how we can help"
                                    className="bg-white border-gray-300 focus:border-gold min-h-32"
                                    {...field}
                                    name="message"
                                  />
                                </FormControl>
                                <FormMessage className="text-red-500" />
                              </FormItem>
                            )}
                          />
                        </motion.div>

                        <motion.div
                          variants={itemVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <Button
                            type="submit"
                            className="bg-gold hover:bg-gold-80 text-white"
                          >
                            Send Message
                          </Button>
                        </motion.div>
                      </form>
                    </Form>
                  )}
                </div>
              </motion.div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <motion.div
                  className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm mb-8"
                  variants={itemVariants}
                >
                  <h2 className="text-2xl font-semibold text-foreground mb-6">
                    Contact Information
                  </h2>

                  <div className="space-y-6">
                    <motion.div
                      className="flex items-start"
                      variants={itemVariants}
                      whileHover={{ x: 5 }}
                    >
                      <div className="p-2 rounded-full bg-gold-10 mr-4">
                        <Mail className="h-5 w-5 text-gold" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <a
                          href="mailto:versatalent.management@gmail.com"
                          className="text-foreground hover:text-gold"
                        >
                          versatalent.management@gmail.com
                        </a>
                      </div>
                    </motion.div>

                    <motion.div
                      className="flex items-start"
                      variants={itemVariants}
                      whileHover={{ x: 5 }}
                    >
                      <div className="p-2 rounded-full bg-gold-10 mr-4">
                        <Phone className="h-5 w-5 text-gold" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <a
                          href="tel:+1234567890"
                          className="text-foreground hover:text-gold"
                        >
                          +1 (234) 567-890
                        </a>
                      </div>
                    </motion.div>

                    <motion.div
                      className="flex items-start"
                      variants={itemVariants}
                      whileHover={{ x: 5 }}
                    >
                      <div className="p-2 rounded-full bg-gold-10 mr-4">
                        <Instagram className="h-5 w-5 text-gold" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Instagram</p>
                        <a
                          href="https://instagram.com/versatalent"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-gold"
                        >
                          @versatalent
                        </a>
                      </div>
                    </motion.div>

                    <motion.div
                      className="flex items-start"
                      variants={itemVariants}
                      whileHover={{ x: 5 }}
                    >
                      <div className="p-2 rounded-full bg-gold-10 mr-4">
                        <Clock className="h-5 w-5 text-gold" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Business Hours</p>
                        <p className="text-foreground">Monday-Friday: 9am-6pm</p>
                        <p className="text-foreground">Weekend: By appointment</p>
                      </div>
                    </motion.div>

                    <motion.div
                      className="flex items-start"
                      variants={itemVariants}
                      whileHover={{ x: 5 }}
                    >
                      <div className="p-2 rounded-full bg-gold-10 mr-4">
                        <MapPin className="h-5 w-5 text-gold" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Location</p>
                        <p className="text-foreground">
                          Leeds, <br />
                          United Kingdom
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-r from-gold-10 to-white p-6 rounded-lg border border-gold-20 shadow-sm"
                  variants={itemVariants}
                  whileHover={{
                    y: -5,
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    Looking for a specific department?
                  </h3>
                  <p className="text-gray-600 mb-4">
                    For talent acquisition: <br />
                    <a
                      href="mailto:versatalent.management@gmail.com?subject=Talent%20Acquisition"
                      className="text-gold hover:underline"
                    >
                      talent@versatalent.com
                    </a>
                  </p>
                  <p className="text-gray-600">
                    For brand partnerships: <br />
                    <a
                      href="mailto:versatalent.management@gmail.com?subject=Brand%20Partnership"
                      className="text-gold hover:underline"
                    >
                      partners@versatalent.com
                    </a>
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
