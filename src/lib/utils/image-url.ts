/**
 * Image URL Utilities
 * Handles conversion of various image hosting services to direct image URLs
 */

/**
 * Convert Google Drive share link to direct image URL
 *
 * Supports multiple Google Drive URL formats:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/file/d/FILE_ID/view
 *
 * Converts to: https://lh3.googleusercontent.com/d/FILE_ID
 * (Google's CDN - works better for embedding, avoids CORS/403 errors)
 */
export function convertGoogleDriveUrl(url: string): string {
  if (!url) return url;

  // Check if it's a Google Drive URL
  if (!url.includes('drive.google.com')) {
    return url;
  }

  // Extract file ID using regex patterns
  let fileId: string | null = null;

  // Pattern 1: /file/d/FILE_ID/view
  const pattern1 = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match1 = url.match(pattern1);
  if (match1) {
    fileId = match1[1];
  }

  // Pattern 2: /open?id=FILE_ID
  const pattern2 = /[?&]id=([a-zA-Z0-9_-]+)/;
  const match2 = url.match(pattern2);
  if (match2) {
    fileId = match2[1];
  }

  // Pattern 3: /d/FILE_ID (general pattern)
  const pattern3 = /\/d\/([a-zA-Z0-9_-]+)/;
  const match3 = url.match(pattern3);
  if (match3) {
    fileId = match3[1];
  }

  // If we found a file ID, convert to Google's CDN URL
  // This format works better for embedding and avoids CORS/403 issues
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  // If already in CDN format, return as is
  if (url.includes('googleusercontent.com/d/')) {
    return url;
  }

  // If already in uc format, convert to CDN format
  if (url.includes('/uc?export=view&id=')) {
    const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (ucMatch) {
      return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`;
    }
  }

  // Return original URL if we couldn't extract ID
  console.warn('Could not extract Google Drive file ID from:', url);
  return url;
}

/**
 * Process any image URL and convert if necessary
 * Currently handles:
 * - Google Drive URLs
 * - Other URLs (returned as-is)
 */
export function processImageUrl(url: string): string {
  if (!url || !url.trim()) return url;

  const trimmedUrl = url.trim();

  // Convert Google Drive URLs
  if (trimmedUrl.includes('drive.google.com')) {
    return convertGoogleDriveUrl(trimmedUrl);
  }

  // Return other URLs as-is
  return trimmedUrl;
}

/**
 * Validate if a URL is likely to be a valid image URL
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || !url.trim()) return false;

  try {
    const urlObj = new URL(url);

    // Check if it's a valid HTTP/HTTPS URL
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Known image hosting domains
    const validDomains = [
      'drive.google.com',
      'googleusercontent.com',
      'images.unsplash.com',
      'unsplash.com',
      'imgur.com',
      'i.imgur.com',
      'cloudinary.com',
      'aws.amazon.com',
      's3.amazonaws.com',
      'same-assets.com',
    ];

    // Check if domain is in the valid list or if URL ends with image extension
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();

    const isKnownDomain = validDomains.some(domain => hostname.includes(domain));
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(pathname);

    return isKnownDomain || hasImageExtension;
  } catch {
    return false;
  }
}
