import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { isUploadFolder, readUpload } from '@/lib/services/upload-storage';

/**
 * GET /api/uploads/[folder]/[filename]
 * Public: serves admin-uploaded images stored in Netlify Blobs.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ folder: string; filename: string }> }
) {
  const { folder, filename } = await context.params;

  if (!isUploadFolder(folder) || filename !== path.basename(filename)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const upload = await readUpload(folder, filename);

    if (!upload) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return new NextResponse(upload.data, {
      headers: {
        'Content-Type': upload.contentType,
        // Filenames are unique per upload, so they can be cached forever
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error reading upload:', error);
    return NextResponse.json({ error: 'Failed to read upload' }, { status: 500 });
  }
}
