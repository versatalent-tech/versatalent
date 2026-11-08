export type NotificationKind =
  | 'task_assigned'
  | 'task_due'
  | 'booking_shared'
  | 'booking_confirmed'
  | 'booking_changed'
  | 'booking_cancelled'
  | 'booking_reminder'
  | 'profile_reviewed'
  | 'document_shared'
  | 'payout_paid';

/** What to tell someone; dedupeKey stops the same one being saved twice */
export interface NotificationMessage {
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  dedupeKey?: string;
}

/** One notification as the portal bell shows it */
export interface PortalNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

/** A phone or browser that switched push on */
export interface PushDevice {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}
