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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }),
  industry: z.enum(["acting", "modeling", "music", "culinary", "sports", "other"]),
  experience: z.string().min(1, {
    message: "Please describe your experience.",
  }),
  portfolioLink: z.string().url({
    message: "Please enter a valid URL.",
  }).optional().or(z.literal("")),
  message: z.string().min(10, {
    message: "Your message must be at least 10 characters.",
  }).max(500, {
    message: "Your message must not exceed 500 characters.",
  }),
});

export default function JoinPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      industry: "acting",
      experience: "",
      portfolioLink: "",
      message: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ "form-name": "join", ...values }).toString(),
    })
      .then(() => setIsSubmitted(true))
      .catch((error) => alert(error));
  }

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

              {isSubmitted ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/20 text-gold mb-4">
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
                  <h3 className="text-xl text-white mb-2">Application Received!</h3>
                  <p className="text-gray-300 mb-4">
                    Thank you for your interest in joining VersaTalent. Our team will review your application and get back to you within 3-5 business days.
                  </p>
                  <Button
                    variant="outline"
                    className="border-gold text-gold hover:bg-gold hover:text-black"
                    onClick={() => setIsSubmitted(false)}
                  >
                    Submit Another Application
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form
                    name="join"
                    data-netlify="true"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your full name" className="bg-zinc-800 border-zinc-700 text-white" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Email</FormLabel>
                            <FormControl>
                              <Input placeholder="your.email@example.com" className="bg-zinc-800 border-zinc-700 text-white" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Your phone number" className="bg-zinc-800 border-zinc-700 text-white" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Industry</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                  <SelectValue placeholder="Select your industry" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectItem value="acting">Acting</SelectItem>
                                <SelectItem value="modeling">Modeling</SelectItem>
                                <SelectItem value="music">Music</SelectItem>
                                <SelectItem value="culinary">Culinary Arts</SelectItem>
                                <SelectItem value="sports">Sports</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Experience</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Briefly describe your experience in your industry"
                              className="bg-zinc-800 border-zinc-700 min-h-24 text-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="portfolioLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Portfolio Link (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Link to your website, Instagram, YouTube, etc."
                              className="bg-zinc-800 border-zinc-700 text-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Why do you want to join VersaTalent?</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us why you want to join and what makes you unique"
                              className="bg-zinc-800 border-zinc-700 min-h-24 text-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="bg-gold hover:bg-gold/90 text-black w-full md:w-auto">
                      Submit Application
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
