"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

interface NewsletterFormProps {
  title?: string;
  description?: string;
  buttonText?: string;
  className?: string;
}

export function NewsletterForm({
  title = "Subscribe to Our Newsletter",
  description = "Get the latest industry insights and talent spotlights delivered to your inbox.",
  buttonText = "Subscribe",
  className = "bg-gradient-to-r from-gold-10 to-white border border-gold-20 shadow-sm p-6 rounded-lg"
}: NewsletterFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Show the success message immediately for better UX
    setIsSubmitted(true);

    // Netlify Forms handles the actual form submission
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      whileHover={{
        y: -5,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
      }}
    >
      <h3 className="text-lg font-semibold text-foreground mb-3">{title}</h3>

      {isSubmitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="text-center py-4"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold-10 text-gold mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-gray-600 mb-3">
            Thanks for subscribing! We'll keep you updated with our latest news.
          </p>
          <Button
            variant="outline"
            className="text-sm border-gold text-gold hover:bg-gold hover:text-white"
            onClick={() => setIsSubmitted(false)}
            size="sm"
          >
            Subscribe another email
          </Button>
        </motion.div>
      ) : (
        <>
          <p className="text-gray-600 text-sm mb-4">{description}</p>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              name="newsletter"
              method="POST"
              data-netlify="true"
              netlify-honeypot="bot-field"
            >
              <input type="hidden" name="form-name" value="newsletter" />
              <input type="hidden" name="subject" value="VersaTalent Newsletter Subscription" />
              <p className="hidden">
                <label>
                  Don't fill this out if you're human: <input name="bot-field" />
                </label>
              </p>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Your email address"
                        className="bg-white border-gray-200 focus:border-gold"
                        {...field}
                        name="email"
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-xs mt-1" />
                  </FormItem>
                )}
              />

              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button
                  type="submit"
                  className="w-full bg-gold hover:bg-gold-80 text-white"
                >
                  {buttonText}
                </Button>
              </motion.div>
            </form>
          </Form>
        </>
      )}
    </motion.div>
  );
}
