/**
 * Customer messages: ticket buyer queues (confirmation, reminder, after the
 * event) and the template library used at each stage of promoting an event.
 * Messages are sent by hand (no email provider yet) and marked sent in the
 * admin. No server imports: bundled into client components.
 */

export { fillTemplate } from '@/lib/outreach/types';

export const STAGE_KEYS = ['ticket_confirmation', 'event_reminder', 'post_event', 'post_event_no_show', 'promotion', 'general'] as const;
export type Stage = (typeof STAGE_KEYS)[number];

/** Placeholders filled for one ticket order */
export const ORDER_PLACEHOLDERS = [
  'first_name',
  'last_name',
  'event',
  'event_date',
  'event_time',
  'venue',
  'reference',
  'quantity',
  'tickets',
  'order_link',
  'tickets_link',
  'events_link',
] as const;

/** Placeholders filled for an event (promotion: one message for everyone) */
export const EVENT_PLACEHOLDERS = ['event', 'event_date', 'event_time', 'venue', 'tickets_link', 'events_link'] as const;

export interface StageDefinition {
  key: Stage;
  title: string;
  /** When it's used */
  hint: string;
  placeholders: readonly string[];
}

export const STAGES: Record<Stage, StageDefinition> = {
  ticket_confirmation: {
    key: 'ticket_confirmation',
    title: 'Ticket confirmation',
    hint: 'Sent with the PDF tickets once they are made',
    placeholders: ORDER_PLACEHOLDERS,
  },
  event_reminder: {
    key: 'event_reminder',
    title: 'Before the event',
    hint: 'A reminder in the 3 days before the event',
    placeholders: ORDER_PLACEHOLDERS,
  },
  post_event: {
    key: 'post_event',
    title: 'After the event: came',
    hint: 'Follow-up for buyers who were scanned in',
    placeholders: ORDER_PLACEHOLDERS,
  },
  post_event_no_show: {
    key: 'post_event_no_show',
    title: "After the event: didn't come",
    hint: 'Follow-up for buyers nobody on the order was scanned in for',
    placeholders: ORDER_PLACEHOLDERS,
  },
  promotion: {
    key: 'promotion',
    title: 'Promotion',
    hint: 'Announcements, captions and last-call messages for an event',
    placeholders: EVENT_PLACEHOLDERS,
  },
  general: {
    key: 'general',
    title: 'General',
    hint: 'Anything else you send often',
    placeholders: ORDER_PLACEHOLDERS,
  },
};

/** The ticket buyer queues and the template stages each one uses */
export const QUEUE_KEYS = ['confirmation', 'reminder', 'follow_up'] as const;
export type Queue = (typeof QUEUE_KEYS)[number];

export const QUEUES: Record<Queue, { title: string; rule: string; stages: Stage[] }> = {
  confirmation: {
    title: 'Ticket confirmations',
    rule: 'Paid in the last 30 days for an event that has not happened yet. Make the PDF, attach it and send.',
    stages: ['ticket_confirmation', 'general'],
  },
  reminder: {
    title: 'Reminders',
    rule: 'Paid orders for events starting in the next 3 days.',
    stages: ['event_reminder', 'general'],
  },
  follow_up: {
    title: 'After the event',
    rule: 'Paid orders for events that ended in the last 14 days.',
    stages: ['post_event', 'post_event_no_show', 'general'],
  },
};

export const MESSAGE_CHANNELS = {
  email: 'Email',
  instagram: 'Instagram DM',
  whatsapp: 'WhatsApp',
  sms: 'Text',
  phone: 'Phone call',
  in_person: 'In person',
  other: 'Other',
  skipped: 'Skipped (not contacted)',
} as const;
export type MessageChannel = keyof typeof MESSAGE_CHANNELS;

export interface MessageTemplate {
  id: string;
  stage: Stage;
  name: string;
  /** null = a short message with no subject (DM, text, caption) */
  subject: string | null;
  body: string;
  is_default: boolean;
  sort_order: number;
  updated_at: string;
}

export interface TicketMessageCandidate {
  order_id: string;
  reference: string;
  name: string;
  email: string;
  phone: string | null;
  instagram: string;
  event_id: string | null;
  event_title: string;
  event_starts_at: string | null;
  tickets: string;
  marketing_consent: boolean;
  /** PDF made (confirmation queue) */
  has_pdf: boolean;
  /** Someone on the order was scanned in (follow-up queue) */
  attended: boolean;
  /** The template stage to pick first for this order */
  suggested_stage: Stage;
  values: Record<string, string>;
}

export interface PromoEvent {
  id: string;
  title: string;
  starts_at: string;
  values: Record<string, string>;
  /** Past buyers (other events) who agreed to marketing and haven't bought for this one */
  past_buyer_emails: string[];
}

export interface TicketMessageLogEntry {
  id: string;
  order_id: string;
  reference: string;
  name: string;
  event_title: string;
  queue: Queue;
  template_name: string | null;
  channel: MessageChannel;
  sent_by_name: string | null;
  created_at: string;
}

/** Example values for previews in the template editor */
export const SAMPLE_VALUES: Record<string, string> = {
  first_name: 'Alex',
  last_name: 'Smith',
  event: 'Summer Social',
  event_date: 'Saturday 14 November',
  event_time: '22:00',
  venue: 'The Venue, London',
  reference: 'VT-AB12CD',
  quantity: '2',
  tickets: '2 × General admission',
  order_link: 'https://example.com/tickets/order/…',
  tickets_link: 'https://example.com/events/…/tickets',
  events_link: 'https://example.com/events',
};

/** The texts added the first time the page is opened (and to reset to) */
export const DEFAULT_TEMPLATES: { stage: Stage; name: string; subject: string | null; body: string; is_default: boolean }[] = [
  {
    stage: 'ticket_confirmation',
    name: 'Confirmation email',
    is_default: true,
    subject: 'Your tickets for {event} ({reference})',
    body:
      "Hi {first_name},\n\nThanks for booking! Your tickets for {event} are attached to this email.\n\nWhen: {event_date}, {event_time}\nWhere: {venue}\nTickets: {tickets}\nOrder: {reference}\n\nEach ticket has its own QR code, which we scan at the door. Show it on your phone or bring a printout.\n\nYou can see your order any time here: {order_link}\n\nSee you there,\nVersaTalent",
  },
  {
    stage: 'ticket_confirmation',
    name: 'Confirmation DM',
    is_default: false,
    subject: null,
    body:
      "Hi {first_name}! Your tickets for {event} on {event_date} are confirmed (order {reference}). I've emailed your PDF tickets with a QR code for each person. See you there!",
  },
  {
    stage: 'event_reminder',
    name: 'Reminder email',
    is_default: true,
    subject: 'See you soon at {event}',
    body:
      "Hi {first_name},\n\nJust a reminder that {event} is on {event_date}, {event_time} at {venue}.\n\nHave your tickets ready on your phone (or printed) so we can scan them at the door. Your order: {order_link}\n\nSee you there,\nVersaTalent",
  },
  {
    stage: 'event_reminder',
    name: 'Reminder DM',
    is_default: false,
    subject: null,
    body: "Hi {first_name}! See you at {event} on {event_date}, {event_time}. Have your tickets ready to scan at the door.",
  },
  {
    stage: 'post_event',
    name: 'Thanks for coming',
    is_default: true,
    subject: 'Thanks for coming to {event}',
    body:
      "Hi {first_name},\n\nThank you for coming to {event}! We hope you had a great night.\n\nWe'd love to hear what you thought: just reply to this message. And if you took any photos or videos, tag us on Instagram.\n\nSee you at the next one: {events_link}\n\nVersaTalent",
  },
  {
    stage: 'post_event_no_show',
    name: 'Sorry we missed you',
    is_default: true,
    subject: 'We missed you at {event}',
    body:
      "Hi {first_name},\n\nWe didn't see you at {event} on {event_date}. We hope everything's OK!\n\nHere's what's coming up next, we'd love to see you there: {events_link}\n\nVersaTalent",
  },
  {
    stage: 'promotion',
    name: 'Announcement (Instagram caption)',
    is_default: true,
    subject: null,
    body: '{event}\n\n📅 {event_date}, {event_time}\n📍 {venue}\n\nTickets on sale now: link in bio\n{tickets_link}',
  },
  {
    stage: 'promotion',
    name: 'Invite past guests (email)',
    is_default: false,
    subject: "You're invited: {event}",
    body:
      "Hi there,\n\nThanks for coming to one of our events before. Our next one is {event} on {event_date}, {event_time} at {venue}.\n\nGet your tickets here: {tickets_link}\n\nVersaTalent\n\n(You're getting this because you agreed to hear from us when you bought tickets. Just reply if you'd rather not hear from us again.)",
  },
  {
    stage: 'promotion',
    name: 'Last tickets',
    is_default: false,
    subject: 'Last tickets for {event}',
    body: "Last few tickets left for {event} on {event_date}! Don't miss out: {tickets_link}",
  },
];
