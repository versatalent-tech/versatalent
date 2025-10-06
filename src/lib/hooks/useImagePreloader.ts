// New file: Image preloader hook

"use client";

import { useEffect, useState, useRef, useCallback } from 'react';

export function useImagePreloader(src: string) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  const loadImage = useCallback(() => {
    if (!src || isLoaded) return;

    const img = new Image();
    img.src = src;

    img.onload = () => {
      setIsLoaded(true);
      setIsError(false);
    };

    img.onerror = () => {
      setIsError(true);
      setIsLoaded(false);
    };
  }, [src, isLoaded]);

  return {
    isLoaded,
    isError,
    preload: loadImage
  };
}

export function useBatchImagePreloader(images: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const preloadImages = useCallback(async (startIndex: number = 0, count: number = 3) => {
    const imagesToLoad = images.slice(startIndex, startIndex + count);

    await Promise.all(imagesToLoad.map(src => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          setLoadedImages(prev => new Set([...prev, src]));
          resolve(true);
        };
        img.onerror = () => resolve(false);
      });
    }));
  }, [images]);

  return {
    preloadImages,
    loadedImages,
    isLoaded: (src: string) => loadedImages.has(src)
  };
}
