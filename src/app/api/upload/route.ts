import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { requireAdmin } from '@/lib/middleware/auth';
import {
  UPLOAD_FOLDERS,
  deleteUpload,
  saveUpload,
  type UploadType,
} from '@/lib/services/upload-storage';

// Unknown types fall back to 'event' for backward compatibility
function toUploadType(value: string | null | undefined): UploadType {
  return value === 'talent' || value === 'portfolio' ? value : 'event';
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = toUploadType(formData.get('type') as string | null);

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    // Derive the extension from the validated MIME type, never the client-supplied filename
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    const extension = extensions[file.type];

    const filename = `${type}-${timestamp}-${randomString}.${extension}`;
    const publicUrl = await saveUpload(UPLOAD_FOLDERS[type], filename, await file.arrayBuffer(), file.type);

    // Return the public URL
    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: filename,
      type: type,
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// DELETE - Remove uploaded image
export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const type = toUploadType(searchParams.get('type'));

    if (!filename) {
      return NextResponse.json(
        { error: 'No filename provided' },
        { status: 400 }
      );
    }

    const allowedPrefix = `${type}-`;

    // Security check: only allow deletion of files with correct prefix,
    // and no path segments (e.g. "event-../../..")
    if (!filename.startsWith(allowedPrefix) || filename !== path.basename(filename)) {
      return NextResponse.json(
        { error: `Can only delete ${type} images` },
        { status: 403 }
      );
    }

    const deleted = await deleteUpload(UPLOAD_FOLDERS[type], filename);

    if (!deleted) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
