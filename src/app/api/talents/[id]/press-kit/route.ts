import { NextRequest, NextResponse } from 'next/server';
import { getTalentById } from '@/lib/db/repositories/talents';
import { getPublicPressKit } from '@/lib/db/repositories/documents';
import { readDocumentFile } from '@/lib/services/document-storage';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/talents/[id]/press-kit - public: the comp card the team marked as
 * this talent's public press kit (Talent documents → "Public press kit").
 * Nothing else from the private documents store is reachable here.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notFound = () => new NextResponse('Not found', { status: 404 });
  if (!isValidUUID(id)) return notFound();

  try {
    const talent = await getTalentById(id);
    if (!talent || !talent.is_active) return notFound();
    const kit = await getPublicPressKit(id);
    if (!kit) return notFound();
    const data = await readDocumentFile(kit.blob_key);
    if (!data) return notFound();

    const asciiName = kit.filename.replace(/[^\x20-\x7e]/g, '_');
    return new NextResponse(data, {
      headers: {
        'Content-Type': kit.content_type,
        'Content-Length': String(data.byteLength),
        'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(kit.filename)}`,
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    console.error('Error serving press kit:', error);
    return new NextResponse('Download failed', { status: 500 });
  }
}
