import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'event'; // default to 'event' for backward compatibility

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

    // Determine directory and filename based on type
    let uploadDir: string;
    let filename: string;
    let publicUrl: string;

    switch (type) {
      case 'talent':
        uploadDir = path.join(process.cwd(), 'public', 'images', 'talents');
        filename = `talent-${timestamp}-${randomString}.${extension}`;
        publicUrl = `/images/talents/${filename}`;
        break;

      case 'portfolio':
        uploadDir = path.join(process.cwd(), 'public', 'images', 'portfolio');
        filename = `portfolio-${timestamp}-${randomString}.${extension}`;
        publicUrl = `/images/portfolio/${filename}`;
        break;

      case 'event':
      default:
        uploadDir = path.join(process.cwd(), 'public', 'images', 'events');
        filename = `event-${timestamp}-${randomString}.${extension}`;
        publicUrl = `/images/events/${filename}`;
        break;
    }

    // Create directory if it doesn't exist
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filepath = path.join(uploadDir, filename);
    await fs.writeFile(filepath, buffer);

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
    const type = searchParams.get('type') || 'event';

    if (!filename) {
      return NextResponse.json(
        { error: 'No filename provided' },
        { status: 400 }
      );
    }

    // Determine directory based on type
    let subdirectory: string;
    let allowedPrefix: string;

    switch (type) {
      case 'talent':
        subdirectory = 'talents';
        allowedPrefix = 'talent-';
        break;
      case 'portfolio':
        subdirectory = 'portfolio';
        allowedPrefix = 'portfolio-';
        break;
      case 'event':
      default:
        subdirectory = 'events';
        allowedPrefix = 'event-';
        break;
    }

    // Security check: only allow deletion of files with correct prefix,
    // and no path segments (e.g. "event-../../..")
    if (!filename.startsWith(allowedPrefix) || filename !== path.basename(filename)) {
      return NextResponse.json(
        { error: `Can only delete ${type} images` },
        { status: 403 }
      );
    }

    const filepath = path.join(process.cwd(), 'public', 'images', subdirectory, filename);

    try {
      await fs.unlink(filepath);
      return NextResponse.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      // File might not exist
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
