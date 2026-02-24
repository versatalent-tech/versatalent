"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import { processImageUrl } from "@/lib/utils/image-url";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  type?: 'event' | 'talent' | 'portfolio';
}

export function ImageUpload({ value, onChange, onRemove, type = 'event' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side image optimization
  const optimizeImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas not supported'));
            return;
          }

          // Target dimensions based on type
          const targetDimensions = {
            talent: { width: 1200, height: 800 },
            event: { width: 1200, height: 800 },
            portfolio: { width: 1200, height: 800 },
          };

          const target = targetDimensions[type];

          // Calculate new dimensions maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          const aspectRatio = width / height;
          const targetRatio = target.width / target.height;

          if (width > target.width || height > target.height) {
            if (aspectRatio > targetRatio) {
              width = target.width;
              height = Math.round(width / aspectRatio);
            } else {
              height = target.height;
              width = Math.round(height * aspectRatio);
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with compression
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // If still too large, reduce quality further
                if (blob.size > 500 * 1024) {
                  canvas.toBlob(
                    (smallerBlob) => {
                      resolve(smallerBlob || blob);
                    },
                    'image/jpeg',
                    0.7
                  );
                } else {
                  resolve(blob);
                }
              } else {
                reject(new Error('Failed to create blob'));
              }
            },
            'image/jpeg',
            0.85
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error
    setError(null);

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    try {
      setUploading(true);
      setOptimizing(true);

      // Optimize the image
      const optimizedBlob = await optimizeImage(file);
      const optimizedFile = new File([optimizedBlob], file.name, {
        type: 'image/jpeg',
      });

      setOptimizing(false);

      const formData = new FormData();
      formData.append('file', optimizedFile);
      formData.append('type', type);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onChange(data.url);
      setError(null);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      setOptimizing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    // Extract filename from URL
    const filename = value.split('/').pop();

    try {
      // Determine file prefix based on type
      const prefixes = {
        event: 'event-',
        talent: 'talent-',
        portfolio: 'portfolio-',
      };

      // Only attempt to delete if it's an uploaded file with correct prefix
      if (filename && filename.startsWith(prefixes[type])) {
        await fetch(`/api/upload?filename=${filename}&type=${type}`, {
          method: 'DELETE',
        });
      }
    } catch (err) {
      console.error('Error removing image:', err);
    }

    onChange('');
    if (onRemove) onRemove();
  };

  return (
    <div className="space-y-4">
      {/* URL Input - Primary option */}
      <div className="space-y-2 bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <LinkIcon className="h-4 w-4 text-blue-600" />
          <label className="text-sm font-semibold text-blue-900">
            Option 1: Paste Image URL (Fastest!)
          </label>
        </div>
        <Input
          type="url"
          value={value || ''}
          onChange={(e) => {
            const processedUrl = processImageUrl(e.target.value);
            onChange(processedUrl);
            setError(null);
          }}
          placeholder="https://images.unsplash.com/photo-... or Google Drive link"
          className="bg-white"
        />
        <p className="text-xs text-blue-700">
          ✨ Paste a link from Unsplash, Imgur, Google Drive, or any image URL
        </p>
        <p className="text-xs text-blue-600 mt-1">
          💡 Google Drive: Share your image → Copy link → Paste here (auto-converts to direct URL)
        </p>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white text-gray-600 font-semibold">OR</span>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="h-4 w-4 text-gray-600" />
          <label className="text-sm font-semibold text-gray-900">
            Option 2: Upload from Computer
          </label>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          {optimizing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Optimizing image...
            </>
          ) : uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Select Image File
            </>
          )}
        </Button>
        <p className="text-xs text-gray-600 mt-2">
          📷 Any image format • Auto-optimized to 1200x800px • Compressed to &lt;500KB
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-800 bg-red-50 border border-red-200 p-3 rounded-md">
          <span className="text-red-600 font-bold">✕</span>
          <span>{error}</span>
        </div>
      )}

      {/* Image Preview */}
      {value && !uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-green-700">✓ Image loaded</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onChange('');
                setError(null);
              }}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
          <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden border-2 border-green-200">
            <img
              src={value}
              alt="Preview"
              className="w-full h-auto object-contain max-h-64"
              onError={() => setError('Failed to load image from URL. Please check the URL is correct.')}
            />
          </div>
          <p className="text-xs text-gray-600 break-all">
            {value.length > 80 ? `${value.substring(0, 80)}...` : value}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!value && !uploading && !optimizing && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
          <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700 mb-1">
            No image selected
          </p>
          <p className="text-xs text-gray-500">
            Paste a URL above or upload a file
          </p>
        </div>
      )}
    </div>
  );
}
