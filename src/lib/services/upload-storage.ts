/**
 * Persistent storage for admin image uploads
 *
 * On Netlify the function filesystem is ephemeral, so files written to
 * public/ vanish. Uploads are stored in Netlify Blobs instead and served by
 * /api/uploads/[folder]/[filename]. In local development (no Blobs
 * environment) they fall back to public/images/<folder>, as before.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { getStore } from '@netlify/blobs';

export const UPLOAD_FOLDERS = {
  event: 'events',
  talent: 'talents',
  portfolio: 'portfolio',
} as const;

export type UploadType = keyof typeof UPLOAD_FOLDERS;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[UploadType];

const STORE_NAME = 'uploads';

export function isUploadFolder(value: string): value is UploadFolder {
  return (Object.values(UPLOAD_FOLDERS) as string[]).includes(value);
}

/**
 * The Blobs store, or null when not running on Netlify (local dev).
 * In production a missing Blobs environment is an error, not a silent
 * fallback to the ephemeral filesystem.
 */
function getUploadStore() {
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

function blobKey(folder: UploadFolder, filename: string) {
  return `${folder}/${filename}`;
}

function localPath(folder: UploadFolder, filename: string) {
  return path.join(process.cwd(), 'public', 'images', folder, filename);
}

/**
 * Save an upload and return its public URL
 */
export async function saveUpload(
  folder: UploadFolder,
  filename: string,
  data: ArrayBuffer,
  contentType: string
): Promise<string> {
  const store = getUploadStore();

  if (store) {
    await store.set(blobKey(folder, filename), data, { metadata: { contentType } });
    return `/api/uploads/${folder}/${filename}`;
  }

  const filepath = localPath(folder, filename);
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, Buffer.from(data));
  return `/images/${folder}/${filename}`;
}

/**
 * Read an upload from Blobs. Returns null if it doesn't exist.
 */
export async function readUpload(
  folder: UploadFolder,
  filename: string
): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  const store = getUploadStore();
  if (!store) {
    return null;
  }

  const result = await store.getWithMetadata(blobKey(folder, filename), { type: 'arrayBuffer' });
  if (!result) {
    return null;
  }

  const contentType = typeof result.metadata.contentType === 'string'
    ? result.metadata.contentType
    : 'application/octet-stream';

  return { data: result.data, contentType };
}

/**
 * Delete an upload. Returns false if it didn't exist (local dev only;
 * Blobs deletes are idempotent).
 */
export async function deleteUpload(folder: UploadFolder, filename: string): Promise<boolean> {
  const store = getUploadStore();

  if (store) {
    await store.delete(blobKey(folder, filename));
    return true;
  }

  try {
    await fs.unlink(localPath(folder, filename));
    return true;
  } catch {
    return false;
  }
}
