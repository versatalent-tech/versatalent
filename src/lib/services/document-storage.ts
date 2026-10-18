/**
 * Private storage for documents (contracts, riders, briefs).
 *
 * Unlike image uploads, nothing here is public: files live in their own
 * Netlify Blobs store and are only served by /api/documents/[id], which
 * checks who's asking. In local development (no Blobs environment) they go
 * to .private-uploads/documents, which git ignores.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'documents';

function getDocumentStore() {
  try {
    return getStore({ name: STORE_NAME, consistency: 'strong' });
  } catch (error) {
    const isMissingEnv = error instanceof Error && error.name === 'MissingBlobsEnvironmentError';
    if (isMissingEnv && process.env.NODE_ENV !== 'production') {
      return null;
    }
    throw error;
  }
}

function localPath(key: string) {
  return path.join(process.cwd(), '.private-uploads', 'documents', path.basename(key));
}

export async function saveDocumentFile(key: string, data: ArrayBuffer): Promise<void> {
  const store = getDocumentStore();
  if (store) {
    await store.set(key, data);
    return;
  }
  const filepath = localPath(key);
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, Buffer.from(data));
}

export async function readDocumentFile(key: string): Promise<ArrayBuffer | null> {
  const store = getDocumentStore();
  if (store) {
    return (await store.get(key, { type: 'arrayBuffer' })) ?? null;
  }
  try {
    const buffer = await fs.readFile(localPath(key));
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
}

/** Remove stored files; missing ones are ignored */
export async function deleteDocumentFiles(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const store = getDocumentStore();
  await Promise.all(
    keys.map(async (key) => {
      try {
        if (store) await store.delete(key);
        else await fs.unlink(localPath(key));
      } catch (error) {
        console.error(`[documents] Couldn't delete file ${key}:`, error);
      }
    })
  );
}
