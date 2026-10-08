-- 025: CRM core - organisations, contacts, deals (pipeline), activities/tasks, website enquiries
--
-- Visibility (enforced in the app): admins see everything; managers see deals
-- they own or created, or that involve a talent assigned to them, plus the
-- organisations, contacts and activities attached to those deals.

BEGIN;

CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other'
    CHECK (type IN ('brand', 'agency', 'venue', 'promoter', 'production', 'private', 'other')),
  website text,
  email text,
  phone text,
  city text,
  country text,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_organisations_name ON organisations (lower(name));

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  job_title text,
  -- UK GDPR: why we may contact them
  lawful_basis text NOT NULL DEFAULT 'legitimate_interest'
    CHECK (lawful_basis IN ('legitimate_interest', 'consent')),
  do_not_contact boolean NOT NULL DEFAULT false,
  notes text,
  owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts (organisation_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts (lower(email));

CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  organisation_id uuid REFERENCES organisations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'lead'
    CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  value_cents integer CHECK (value_cents IS NULL OR value_cents >= 0),
  currency text NOT NULL DEFAULT 'GBP',
  expected_close date,
  source text NOT NULL DEFAULT 'other'
    CHECK (source IN ('website_form', 'referral', 'outreach', 'inbound_email', 'instagram', 'phone', 'event', 'other')),
  talent_ids uuid[] NOT NULL DEFAULT '{}',
  lost_reason text,
  notes text,
  owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  stage_changed_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals (stage);
CREATE INDEX IF NOT EXISTS idx_deals_org ON deals (organisation_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON deals (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_deals_talents ON deals USING gin (talent_ids);

-- Notes, calls, emails, meetings, tasks (anything with due_at) and automatic entries
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('note', 'call', 'email', 'meeting', 'task', 'stage_change', 'system')),
  subject text NOT NULL,
  body text,
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  due_at timestamptz,
  completed_at timestamptz,
  owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activities_deal ON activities (deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_org ON activities (organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_open_tasks ON activities (owner_user_id, due_at) WHERE due_at IS NOT NULL AND completed_at IS NULL;

-- Website form submissions (also still sent to Netlify Forms for email alerts)
CREATE TABLE IF NOT EXISTS enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form text NOT NULL CHECK (form IN ('contact', 'brand', 'talent')),
  name text,
  email text,
  phone text,
  company text,
  subject text,
  message text,
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'converted', 'archived', 'spam')),
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  handled_by uuid REFERENCES users(id) ON DELETE SET NULL,
  handled_at timestamptz,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_ip ON enquiries (ip, created_at);

COMMIT;
