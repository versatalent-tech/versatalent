import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel, { EmblaOptionsType } from "embla-carousel-react";
import Image from "next/image";

export interface ThumbItem {
  src: string;
  alt: string;
}

interface ThumbnailCarouselProps {
  items: ThumbItem[];
  onSelect?: (index: number) => void;
  options?: EmblaOptionsType;
}

export function ThumbnailCarousel({ items, onSelect, options }: ThumbnailCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ dragFree: true, containScroll: "trimSnaps", ...options });
  const [selected, setSelected] = useState(0);

  const onSelectCb = useCallback(() => {
    if (!emblaApi) return;
    const idx = emblaApi.selectedScrollSnap();
    setSelected(idx);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelectCb);
  }, [emblaApi, onSelectCb]);

  return (
    <div className="relative">
      {/* Viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {items.map((item, idx) => (
            <button
              key={idx}
              className={`relative flex-shrink-0 rounded-lg overflow-hidden border-2 ${selected === idx ? "border-gold" : "border-transparent"}`}
              style={{ width: 110, height: 110 }}
              onClick={() => onSelect?.(idx)}
            >
              <Image src={item.src} alt={item.alt} fill className="object-cover" sizes="110px" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
