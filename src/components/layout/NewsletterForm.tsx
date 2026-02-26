"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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
  source?: string;
}

export function NewsletterForm({
  title = "Subscribe to Our Newsletter",
  description = "Get the latest industry insights and talent spotlights delivered to your inbox.",
  buttonText = "Subscribe",
  className = "bg-gradient-to-r from-gold-10 to-white border border-gold-20 shadow-sm p-6 rounded-lg",
  source = "website"
}: NewsletterFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      // Call the API to save to database
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          source: source,
          metadata: {
            subscribed_from: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      // Success - show the success message
      setIsSubmitted(true);
      form.reset();
    } catch (err: any) {
      console.error('Newsletter subscription error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className={className}
      transition={{ duration: 0.5 }}
    >
      {title && <h3 className="text-lg font-semibold text-foreground mb-3">{title}</h3>}

      {isSubmitted ? (
        <div
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
        </div>
      ) : (
        <>
          {description && <p className="text-gray-600 text-sm mb-4">{description}</p>}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
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
                        autoComplete="email"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-xs mt-1" />
                  </FormItem>
                )}
              />

              <div
              >
                <Button
                  type="submit"
                  className="w-full bg-gold hover:bg-gold-80 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    buttonText
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </>
      )}
    </div>
  );
}
