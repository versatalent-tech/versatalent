"use client";

import { useState } from "react";
import {
  FacebookShareButton,
  TwitterShareButton,
  LinkedinShareButton,
  WhatsappShareButton,
  FacebookIcon,
  TwitterIcon,
  LinkedinIcon,
  WhatsappIcon,
} from "react-share";
import { Copy, Check, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareButtonsProps {
  title: string;
}

export function ShareButtons({ title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  
  const url = typeof window !== "undefined" ? window.location.href : "";
  
  const shareToInstagram = () => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      window.open("instagram://", "_blank");
    } else {
      window.open("https://www.instagram.com/", "_blank");
    }
  };
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Share this article</h3>
      <div className="flex items-center gap-3 flex-wrap">
        <FacebookShareButton url={url} hashtag="#VersaTalent">
          <FacebookIcon size={40} round />
        </FacebookShareButton>
        
        <TwitterShareButton url={url} title={title} hashtags={["VersaTalent", "Talent"]}>
          <TwitterIcon size={40} round />
        </TwitterShareButton>
        
        <LinkedinShareButton url={url} title={title}>
          <LinkedinIcon size={40} round />
        </LinkedinShareButton>
        
        <WhatsappShareButton url={url} title={title}>
          <WhatsappIcon size={40} round />
        </WhatsappShareButton>
        
        <button
          onClick={shareToInstagram}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:opacity-80 transition-opacity"
          title="Share on Instagram"
        >
          <Instagram className="h-5 w-5 text-white" />
        </button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copy link</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
