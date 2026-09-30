/**
 * Public base URL of the site, without a trailing slash.
 * Set NEXT_PUBLIC_SITE_URL when a custom domain is added.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://versatalent.netlify.app').replace(/\/$/, '');
