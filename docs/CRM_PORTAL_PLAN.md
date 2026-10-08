# VersaTalent CRM, Outreach, KPI & Talent Portal: Plan

_Status: proposal · October 2026_

## 1. Goal

Run the agency's commercial side from one place:

- **CRM & pipeline:** every client, brand, venue and promoter, every enquiry, and every deal from first contact to paid.
- **Bookings:** confirmed jobs for each talent, with dates, fees, commission, documents and status.
- **Outreach:** planned prospecting campaigns with follow-ups that don't get forgotten.
- **KPIs:** a small set of numbers, with targets, that show whether the agency is growing.
- **Access by role:** each talent logs in and sees only their own work. Team members see what their job needs.

## 2. Where we start from (current state)

| Area | Today | Implication |
|---|---|---|
| Users | `users` table with `role` in `admin, staff, artist, vip` and `talent_id`. All 8 artist users are already linked to a talent profile. | The talent portal has its identity link already. |
| Auth | HMAC-signed session cookies. Two cookies (`admin_session`, `staff_session`). The admin is a single shared login from env vars, with no `userId`. | We need per-person team accounts and one session model before adding roles. |
| Enquiries | Contact, brand and talent forms post to **Netlify Forms**, outside the DB. | These become the CRM's lead source. |
| Events | `events.talent_ids` links talents to public events. | Bookings can optionally publish as a public event. |
| Money | `pos_orders` handles till sales only (EUR legacy + GBP). | Booking fees and commission are new. Keep them separate from POS. |
| Gaps | No login rate limiting, no audit log, no password reset for talents. | Fix these before talents and clients' data go in. |

## 3. Roles & access

### 3.1 Roles

| Role | Who | Purpose |
|---|---|---|
| `owner` | Directors | Everything, including team management, finance and settings. |
| `manager` | Talent managers / bookers | CRM, deals and bookings for the talents assigned to them (or all, if flagged). |
| `outreach` | Marketing / business development | Organisations, contacts, campaigns, leads. No fees, contracts or payouts. |
| `finance` | Bookkeeper / accountant | Bookings, invoices, payouts and commission reports. CRM is read-only. |
| `staff` | Event & bar staff (existing) | POS and event-day check-in only. |
| `talent` (today `artist`) | Each talent | Their own profile, bookings, availability, earnings and documents. |
| `vip` | Members (existing) | Card page only. |

### 3.2 Access matrix

R = read, W = write, own = only rows tied to them, assigned = only talents assigned to them.

| Resource | owner | manager | outreach | finance | staff | talent |
|---|---|---|---|---|---|---|
| Admin dashboard KPIs | R | R (assigned) | R (pipeline & outreach) | R (finance) | – | – |
| Organisations & contacts | RW | RW | RW | R | – | – |
| Deals / pipeline | RW | RW (assigned) | RW (until "proposal") | R | – | – |
| Deal value & commission | RW | RW (assigned) | – | R | – | – |
| Bookings | RW | RW (assigned) | R (no fees) | R | – | R (own) |
| Booking fee / net earnings | RW | RW (assigned) | – | RW | – | R (own net + gross) |
| Client contact details on a booking | RW | RW | R | R | – | Only the on-site contact the manager marks as shared |
| Talent availability | RW | RW (assigned) | R | – | – | RW (own) |
| Talent public profile | RW | RW (assigned) | R | – | – | Propose edits (approval needed) |
| Documents (contracts, briefs) | RW | RW (assigned) | – | R | – | R (own, if shared) |
| Outreach campaigns | RW | R | RW | – | – | – |
| Invoices & payouts | RW | R (assigned) | – | RW | – | R (own payouts) |
| Team & roles | RW | – | – | – | – | – |
| POS, NFC, VIP (existing) | RW | R | – | R (sales) | POS / check-in | – |
| Audit log | R | – | – | – | – | – |

### 3.3 How it is enforced

1. **One session cookie** (`vt_session`) carrying `userId`, `role`, `talentId?`. The env-var admin stays as a break-glass login only.
2. **Permission map in code** (`src/lib/auth/permissions.ts`): `role → set of permissions` such as `deals.read` and `deals.write.fees`.
3. **Scoping on the server, never from the client:** every talent query adds `WHERE talent_id = session.talentId`, and every manager query joins `talent_managers`. The API ignores any `talentId` the browser sends for a talent user.
4. **Field filtering:** the API strips fee and commission fields from responses for roles without `*.fees` permission. Hiding them in the UI is not enough.
5. **Area guards:** `/admin/*` needs a team role, `/portal/*` needs the talent role, `/staff/*` stays as it is.
6. **Audit log:** each create, update or delete on CRM, booking, finance or role tables writes `{who, what, before, after, when}`.

## 4. Data model (new tables)

Postgres on the existing Neon project. One migration per phase (`024_…`, `025_…`). Money is stored in integer cents with a currency, like `pos_orders`.

```sql
-- Phase 0: identity
ALTER TABLE users
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN last_login_at timestamptz;
-- role values: owner, manager, outreach, finance, staff, artist (talent), vip
CREATE TABLE talent_managers (user_id uuid REFERENCES users, talent_id uuid REFERENCES talents, PRIMARY KEY (user_id, talent_id));
CREATE TABLE auth_tokens (id uuid PK, user_id uuid, purpose text /* invite|reset */, token_hash text, expires_at timestamptz, used_at timestamptz);
CREATE TABLE login_attempts (id bigserial PK, email text, ip text, success boolean, created_at timestamptz DEFAULT now());
CREATE TABLE audit_log (id bigserial PK, user_id uuid, action text, entity text, entity_id uuid, before jsonb, after jsonb, created_at timestamptz DEFAULT now());

-- Phase 1: CRM
CREATE TABLE organisations (id uuid PK, name text, type text /* brand|agency|venue|promoter|production|private */,
  website text, city text, country text, source text, owner_user_id uuid, tags text[], notes text, created_at, updated_at);
CREATE TABLE contacts (id uuid PK, organisation_id uuid, name text, email text, phone text, job_title text,
  lawful_basis text /* legitimate_interest|consent */, do_not_contact boolean DEFAULT false, owner_user_id uuid, created_at, updated_at);
CREATE TABLE deals (id uuid PK, organisation_id uuid, contact_id uuid, title text,
  stage text /* lead|qualified|proposal|negotiation|won|lost */, value_cents int, currency text DEFAULT 'GBP',
  commission_percent numeric(5,2), expected_close date, owner_user_id uuid, source text /* website_form|referral|outreach|inbound_email|instagram */,
  campaign_id uuid, requested_talent_ids uuid[], lost_reason text, stage_changed_at timestamptz, created_at, updated_at);
CREATE TABLE activities (id uuid PK, type text /* note|call|email|meeting|task */, subject text, body text,
  organisation_id uuid, contact_id uuid, deal_id uuid, booking_id uuid,
  due_at timestamptz, completed_at timestamptz, owner_user_id uuid, created_at);
CREATE TABLE enquiries (id uuid PK, form text /* contact|brand|talent */, payload jsonb, deal_id uuid, status text /* new|converted|spam|archived */, created_at);

-- Phase 2: bookings
CREATE TABLE bookings (id uuid PK, deal_id uuid, talent_id uuid, event_id uuid NULL,
  title text, starts_at timestamptz, ends_at timestamptz, location text, call_time text, brief text,
  status text /* hold|confirmed|completed|cancelled */, fee_cents int, currency text, commission_percent numeric(5,2),
  onsite_contact jsonb, shared_with_talent boolean DEFAULT true, talent_response text /* pending|accepted|declined */,
  created_at, updated_at);
CREATE TABLE talent_availability (id uuid PK, talent_id uuid, starts_on date, ends_on date, kind text /* unavailable|tentative */, note text);
CREATE TABLE documents (id uuid PK, booking_id uuid, deal_id uuid, talent_id uuid, kind text /* contract|brief|invoice|other */,
  blob_key text, filename text, visible_to_talent boolean DEFAULT false, uploaded_by uuid, created_at);
CREATE TABLE talent_profile_changes (id uuid PK, talent_id uuid, submitted_by uuid, changes jsonb, status text /* pending|approved|rejected */, reviewed_by uuid, created_at);

-- Phase 4: outreach
CREATE TABLE outreach_campaigns (id uuid PK, name text, goal text, segment jsonb, channel text, status text /* draft|active|paused|done */, owner_user_id uuid, created_at);
CREATE TABLE outreach_steps (id uuid PK, campaign_id uuid, position int, delay_days int, channel text /* email|linkedin|call|instagram */, template_subject text, template_body text);
CREATE TABLE outreach_enrolments (id uuid PK, campaign_id uuid, contact_id uuid, current_step int, next_due_at timestamptz,
  status text /* active|replied|meeting|not_interested|bounced|unsubscribed|completed */, created_at, updated_at);

-- Phase 5: KPIs
CREATE TABLE kpi_targets (id uuid PK, metric text, period_start date, period_end date, user_id uuid NULL, talent_id uuid NULL, target numeric);
CREATE TABLE kpi_snapshots (id uuid PK, metric text, period date, user_id uuid NULL, talent_id uuid NULL, value numeric, created_at);

-- Phase 6 (optional): finance
CREATE TABLE invoices (id uuid PK, booking_id uuid, organisation_id uuid, number text, amount_cents int, currency text, issued_on date, due_on date, paid_on date, status text, external_id text);
CREATE TABLE talent_payouts (id uuid PK, booking_id uuid, talent_id uuid, gross_cents int, commission_cents int, net_cents int, currency text, paid_on date, status text);
```

**Pipeline flow:** website form → `enquiries` → (triage) → `deals` at stage `lead` → … → `won` → one `bookings` row per talent → `completed` → invoice → payout.

## 5. Features by area

### 5.1 CRM (team, under `/admin/crm`)
- Pipeline board (kanban by stage) with drag-to-move. Each move updates `stage_changed_at` and logs an activity.
- Organisation and contact pages with a timeline (activities, deals, bookings).
- "My tasks today" list: overdue and due activities for the logged-in user.
- Enquiry inbox: website forms land here, not only in Netlify, and convert to a deal in one click. Netlify email notifications can stay on.
- Duplicate check on email or domain when creating contacts and organisations.
- Stale-deal flag: no activity in 14 days. This feeds the dashboard's "Needs attention" list.

### 5.2 Bookings
- Create bookings from a won deal (several talents per deal).
- Holds (`hold`) block the talent's calendar and ask the talent to accept or decline in the portal.
- Calendar view per talent and for the whole agency. Clashes with other bookings or unavailability are flagged.
- Option to publish a booking as a public event (creates or links `events`).
- Documents (stored in Netlify Blobs like current uploads), each with a "visible to talent" switch.

### 5.3 Talent portal (`/portal`)
- **Login:** invite link from admin → set password. Password reset by email. Rate-limited.
- **Home:** next bookings, holds waiting for an answer, documents to read, messages from their manager.
- **My bookings:** list and calendar. Each shows date, call time, location, brief, the shared on-site contact and status.
- **Availability:** mark dates unavailable.
- **Earnings:** gross fee, agency commission and net per booking; payout status; year-to-date total.
- **My profile:** preview of the public page. Edits and new portfolio items go to an approval queue (`talent_profile_changes`).
- **Never shown to talents:** other talents, deal pipeline, client contact details beyond the shared on-site contact, internal notes.

### 5.4 Outreach (under `/admin/outreach`)
- Campaigns built from a segment (e.g. "Yorkshire fashion brands", "wedding venues").
- Sequences of steps (email, LinkedIn, call, Instagram DM) with delays.
- **v1 is task-driven:** the system creates "due today" outreach tasks with the filled-in template. The person sends from their own mailbox or LinkedIn and marks the result (replied, meeting, not interested…). This needs no email infrastructure and avoids deliverability risk.
- **v2:** sending from the platform through a transactional email provider on a sending subdomain (SPF, DKIM, DMARC), with open and reply tracking and one-click unsubscribe.
- **Compliance (UK GDPR / PECR):** record the lawful basis per contact, honour `do_not_contact` everywhere, include an opt-out in every email, and treat sole traders as individuals (they need consent).

### 5.5 KPIs (extend the new `/admin` dashboard, plus a `/admin/kpis` page)

| KPI | Definition | Who sees it |
|---|---|---|
| New leads | Deals created in period, by source | owner, manager, outreach |
| Lead → won rate | Won ÷ (won + lost) for deals closed in period | owner, manager |
| Weighted pipeline | Σ value × stage probability (lead 10%, qualified 25%, proposal 50%, negotiation 75%) | owner, manager, finance |
| Average deal value | Mean `value_cents` of won deals | owner, manager, finance |
| Sales cycle | Median days from created to won | owner, manager |
| First response time | Median hours from enquiry received to first activity. Target under 24h. | owner, manager |
| Outreach reply rate | Enrolments replied ÷ contacted | owner, outreach |
| Meetings booked | Enrolments reaching `meeting` | owner, outreach |
| Bookings confirmed | Count and gross value of bookings confirmed in period | owner, manager, finance |
| Commission revenue | Σ fee × commission% for completed bookings | owner, finance |
| Talent utilisation | Booked days ÷ available days, per talent | owner, manager (assigned), talent (own) |
| Repeat client rate | Share of won deals from organisations with an earlier won deal | owner, manager |
| Cancellation rate | Cancelled ÷ confirmed bookings | owner, manager |
| Outstanding invoices | Unpaid invoice total and days overdue | owner, finance |

Targets live in `kpi_targets`, by month and optionally per person or talent. A nightly scheduled function writes `kpi_snapshots` so trends survive edits to old records.

## 6. Delivery plan

Each phase ships on its own and is usable without the next one.

| Phase | Scope | Size | Depends on |
|---|---|---|---|
| **0. Foundation** | Unified session + roles + permission map; team user management with invites; password reset; login rate limiting; audit log; migrate env-admin to a named `owner` account | M | – |
| **1. CRM core** | Organisations, contacts, deals pipeline board, activities/tasks, enquiry inbox (forms → DB) | L | 0 |
| **2. Bookings** | Bookings from deals, holds, availability, calendar, documents, clash detection | M | 1 |
| **3. Talent portal** | `/portal` login, home, bookings, availability, earnings, profile change requests | M | 0, 2 |
| **4. Outreach v1** | Campaigns, sequences, due-today tasks, templates, outcomes, compliance fields | M | 1 |
| **5. KPIs** | KPI queries, targets, snapshots, role-filtered KPI page, alerts on dashboard | S–M | 1, 2, 4 |
| **6. Finance (optional)** | Invoices and talent payouts; sync with the accounting package | M | 2 |
| **Later** | Outreach v2 (sending + tracking), e-signature for contracts, real profile-view analytics | – | – |

Suggested order: 0 → 1 → 2 → 3 → 4 → 5. The talent portal comes after bookings so it has real content on day one.

## 7. Build vs buy

An off-the-shelf CRM (e.g. HubSpot's free tier) could cover contacts and a pipeline, but not talent bookings, holds, availability, commission or a talent-facing portal. Those would still need building and syncing. With the data already in Neon and the auth and repository patterns already in place, **building in-house is the better fit**. If a team member already uses an external CRM, Phase 1 can import its contacts from CSV.

## 8. Decisions needed

1. **Team:** who holds which role today, and are managers limited to assigned talents?
2. **Commission:** one standard rate per talent, or set per deal? Do talents see gross fee and commission, or only net?
3. **Client visibility:** may talents see the client's name on a booking, or only the event?
4. **Outreach:** is task-driven v1 enough to start, or is sending from the platform needed early?
5. **Finance:** which accounting package (Xero, QuickBooks, none) should invoices sync with, if any?
6. **Portal URL:** `/portal` on the main domain, or a subdomain such as `talent.versatalent…`?
