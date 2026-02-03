"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function SuccessPage() {
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
          <div className="flex gap-4 justify-center">
            <Button
              asChild
              className="bg-gold hover:bg-gold/90 text-white"
            >
              <Link href="/contact.html">Send Another Message</Link>
            </Button>
            <Button
              asChild
              variant="outline"
            >
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}
