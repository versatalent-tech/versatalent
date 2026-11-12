-- 046: customer messages for ticket buyers, and a library of message templates
--
-- Like member outreach: no email provider yet. The admin lists ticket buyers
-- who need a message (confirmation once their PDF is ready, a reminder before
-- the event, a follow-up afterwards), fills a template for each one, and staff
-- send it themselves and mark it sent here so nobody gets it twice.
--
-- Templates are editable and grouped by stage (confirmation, reminder, after
-- the event, promotion, general). The default texts are added by the app the
-- first time the Customer messages page is opened.

BEGIN;

CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage text NOT NULL CHECK (stage IN (
    'ticket_confirmation', 'event_reminder', 'post_event', 'post_event_no_show', 'promotion', 'general'
  )),
  name text NOT NULL,
  subject text,                                   -- NULL = a short message (DM, text, caption)
  body text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,      -- the one picked first for its stage
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_message_templates_stage ON message_templates (stage, sort_order, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_templates_default ON message_templates (stage) WHERE is_default;

-- Messages sent by hand to ticket buyers. One per order per queue.
CREATE TABLE IF NOT EXISTS ticket_message_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  queue text NOT NULL CHECK (queue IN ('confirmation', 'reminder', 'follow_up')),
  template_id uuid REFERENCES message_templates(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'instagram', 'phone', 'in_person', 'other', 'skipped')),
  sent_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, queue)
);
CREATE INDEX IF NOT EXISTS idx_ticket_message_log_created ON ticket_message_log (created_at DESC);

COMMIT;
