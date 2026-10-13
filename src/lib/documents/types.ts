/**
 * Documents on bookings and deals: kinds, limits and shapes.
 * No server imports here: this file is bundled into client components.
 */

export const DOCUMENT_KINDS = {
  contract: 'Contract',
  rider: 'Rider',
  brief: 'Brief',
  invoice: 'Invoice',
  agreement: 'Agency agreement',
  comp_card: 'Comp card / press kit',
  insurance: 'Insurance',
  id_document: 'ID / right to work',
  other: 'Other',
} as const;
export type DocumentKind = keyof typeof DOCUMENT_KINDS;
export const DOCUMENT_KIND_KEYS = Object.keys(DOCUMENT_KINDS) as [DocumentKind, ...DocumentKind[]];

export type DocumentOwnerType = 'booking' | 'deal' | 'talent';

/** The kinds offered for each place a document can belong */
export const KINDS_FOR: Record<DocumentOwnerType, DocumentKind[]> = {
  booking: ['contract', 'rider', 'brief', 'invoice', 'other'],
  deal: ['contract', 'brief', 'invoice', 'other'],
  talent: ['agreement', 'rider', 'comp_card', 'insurance', 'id_document', 'other'],
};

/** Road managers see these kinds only (logistics, no money or contracts) */
export const ROAD_MANAGER_KINDS: DocumentKind[] = ['rider', 'brief'];

/** Kinds that run out: they get an expiry date and a dashboard reminder */
export const EXPIRING_KINDS: DocumentKind[] = ['insurance', 'id_document'];

/** Personal data (UK GDPR): always admin-only, with a date to delete it by */
export const SENSITIVE_KINDS: DocumentKind[] = ['id_document'];

/** Reminders start this many days before a document expires */
export const EXPIRY_WARNING_DAYS = 30;

/** Netlify functions accept request bodies up to 6 MB */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

/** Extensions we accept, with the content type we store and serve */
export const DOCUMENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export const DOCUMENT_ACCEPT = Object.keys(DOCUMENT_TYPES)
  .map((ext) => `.${ext}`)
  .join(',');

export interface DocumentItem {
  id: string;
  booking_id: string | null;
  deal_id: string | null;
  talent_id: string | null;
  kind: DocumentKind;
  filename: string;
  content_type: string;
  size_bytes: number;
  visible_to_talent: boolean;
  admin_only: boolean;
  /** The talent's public press kit, downloadable from their public page (comp cards only) */
  is_public: boolean;
  expires_on: string | null; // YYYY-MM-DD
  delete_after: string | null; // YYYY-MM-DD
  /** Shown on a booking but stored on the talent's profile (their standing rider) */
  from_talent_profile?: boolean;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

/** What a talent sees of a document shared with them */
export interface SharedDocument {
  id: string;
  kind: DocumentKind;
  filename: string;
  expires_on?: string | null;
}

/** A talent document that has expired or expires soon (admin overview) */
export interface ExpiringDocument {
  id: string;
  talent: { id: string; name: string };
  kind: DocumentKind;
  filename: string;
  expires_on: string | null;
  delete_after: string | null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
