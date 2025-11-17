"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
}

export function ImageUpload({ value, onChange, onRemove }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error
    setError(null);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size too large. Maximum size is 5MB.');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onChange(data.url);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
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
      // Only attempt to delete if it's an uploaded event image
      if (filename?.startsWith('event-')) {
        await fetch(`/api/upload?filename=${filename}`, {
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
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full sm:w-auto"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </>
          )}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />

        {value && !uploading && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
          <span>{error}</span>
        </div>
      )}

      {value && !uploading && (
        <div className="relative w-full max-w-md">
          <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
            <img
              src={value}
              alt="Uploaded preview"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 break-all">{value}</p>
        </div>
      )}

      {!value && !uploading && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-1">
            Click "Upload Image" to select a file
          </p>
          <p className="text-xs text-gray-500">
            JPEG, PNG, WebP, or GIF (max 5MB)
          </p>
        </div>
      )}

      <div className="text-xs text-gray-500">
        <p className="font-semibold mb-1">Tips:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Recommended size: 1200x800px (3:2 ratio)</li>
          <li>Keep file size under 500KB for fast loading</li>
          <li>Use descriptive filenames before uploading</li>
        </ul>
      </div>
    </div>
  );
}
