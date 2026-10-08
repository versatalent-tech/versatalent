# VersaTalent CRM, Outreach, KPI & Talent Portal: Plan

_Status: Phases 0–3 built · decisions agreed 8 Oct 2026_

## 1. Goal

Run the agency's commercial side from one place:

- **CRM & pipeline:** every client, brand, venue and promoter, every enquiry, and every deal from first contact to paid.
- **Bookings:** confirmed jobs for each talent, with dates, fees, commission, documents and status.
- **Outreach:** planned prospecting campaigns with follow-ups that don't get forgotten.
- **KPIs:** a small set of numbers, with targets, that show whether the agency is growing.
- **Calendar & meetings:** a calendar of confirmed bookings, and meeting records with AI-written notes and action items.
- **Talent rewards:** talents see the points they earn at our events and the artist perks they're entitled to (perks set by the admin).
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

### 3.1 Roles (agreed)

| Role | Who today | Purpose |
|---|---|---|
| `admin` | Founder | Everything: team, sales, settings, all talents. |
| `manager` | COO | The talents assigned to them, including fees, deals and client details. |
| `road_manager` | The DJ's road manager | Schedule and logistics for assigned talents. No fees, deal values or commission. |
| `staff` | Event & bar staff (existing) | POS and event-day check-in only. |
| `artist` (talent) | Each talent | Their own profile, bookings, availability, net earnings, points, perks and shared documents. |
| `vip` | Members (existing) | Card page only. |

Outreach and finance roles can be added later as entries in the permission map, with no schema change.

**Agreed rules**
- Managers and road managers see **only the talents assigned to them**.
- Commission is set **per talent** (`talents.commission_percent`). Each booking copies the rate when it's created, so later changes don't rewrite history.
- Talents see **only their net** earnings. Gross fee and commission are never sent to the talent role.
- **Client visibility is decided per booking** by the admin or manager (`bookings.client_visible_to_talent`, default off). When it's off, the talent sees the event, venue, times and the on-site contact, but not the client's name.

### 3.2 Access matrix

R = read, W = write, own = only rows tied to them, assigned = only talents assigned to them.

| Resource | admin | manager | road_manager | staff | talent |
|---|---|---|---|---|---|
| Admin dashboard | Full | Assigned talents, no sales | Assigned talents, no sales | – | – |
| Organisations & contacts | RW | RW (deals on assigned talents) | – | – | – |
| Deals / pipeline | RW | RW (assigned) | – | – | – |
| Deal value, fees, commission | RW | RW (assigned) | – | – | Net only (own) |
| Bookings & calendar | RW | RW (assigned) | R + logistics notes (assigned) | – | R (own) |
| Client name on a booking | RW | RW, sets visibility | R (assigned) | – | Only if switched on for that booking |
| Talent availability | RW | RW (assigned) | RW (assigned) | – | RW (own) |
| Talent public profile | RW | Propose (assigned) | – | – | Propose edits (approval needed) |
| Documents (contracts, riders, briefs) | RW | RW (assigned) | R riders & briefs (assigned) | – | R (own, if shared) |
| Meetings & AI notes | RW | RW (own + assigned talents) | R (assigned talents) | – | Only meetings shared with them |
| Points & perks | RW (edit perks) | R (assigned) | – | – | R (own) |
| Team & roles | RW | – | – | – | – |
| POS, NFC, VIP, content (existing) | RW | – | – | POS / check-in | – |
| Audit log | R | – | – | – | – |

### 3.3 How it is enforced

1. **Sessions:** team members use the admin session cookie (`getTeamSession()`, which re-reads role and active status from the database on every request). Staff keep the staff cookie (`getCurrentSession()`, which only accepts admin or staff). Talents will get their own portal session in Phase 3. The env-var admin stays as a fallback login.
2. **Permission map in code** (`src/lib/auth/permissions.ts`): `role → set of permissions` such as `bookings.fees` and `team.manage`, checked by `requireTeamPermission()`.
3. **Scoping on the server, never from the client:** every talent query adds `WHERE talent_id = session.talentId`, and every manager or road-manager query is limited by `getTalentScope()` (the `talent_assignments` table). The API ignores any `talentId` the browser sends for a talent user.
4. **Field filtering:** the API strips fee and commission fields from responses for roles without `*.fees` permission. Hiding them in the UI is not enough.
5. **Area guards:** `/admin/*` needs a team role, `/portal/*` needs the talent role, `/staff/*` stays as it is.
6. **Audit log:** each create, update or delete on CRM, booking, finance or role tables writes `{who, what, before, after, when}`.

## 4. Data model (new tables)

Postgres on the existing Neon project. One migration per phase (`024_…`, `025_…`). Money is stored in integer cents with a currency, like `pos_orders`.

```sql
-- Phase 0: identity (built: migrations/024_team_roles_and_access.sql)
-- users.role: admin, manager, road_manager, staff, artist, vip; users.is_active, users.last_login_at
-- talent_assignments, auth_tokens, login_attempts, audit_log

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
ALTER TABLE talents ADD COLUMN commission_percent numeric(5,2); -- agreed: commission is per talent
CREATE TABLE bookings (id uuid PK, deal_id uuid, talent_id uuid, event_id uuid NULL,
  title text, starts_at timestamptz, ends_at timestamptz, location text, call_time text, brief text,
  status text /* hold|confirmed|completed|cancelled */, fee_cents int, currency text, commission_percent numeric(5,2),
  onsite_contact jsonb, client_visible_to_talent boolean DEFAULT false, shared_with_talent boolean DEFAULT true, talent_response text /* pending|accepted|declined */,
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
| New leads | Deals created in period, by source | admin, manager |
| Lead → won rate | Won ÷ (won + lost) for deals closed in period | admin, manager |
| Weighted pipeline | Σ value × stage probability (lead 10%, qualified 25%, proposal 50%, negotiation 75%) | admin, manager |
| Average deal value | Mean `value_cents` of won deals | admin, manager |
| Sales cycle | Median days from created to won | admin, manager |
| First response time | Median hours from enquiry received to first activity. Target under 24h. | admin, manager |
| Outreach reply rate | Enrolments replied ÷ contacted | admin, manager |
| Meetings booked | Enrolments reaching `meeting` | admin, manager |
| Bookings confirmed | Count and gross value of bookings confirmed in period | admin, manager |
| Commission revenue | Σ fee × commission% for completed bookings | admin |
| Talent utilisation | Booked days ÷ available days, per talent | admin, manager (assigned), road manager (assigned), talent (own) |
| Repeat client rate | Share of won deals from organisations with an earlier won deal | admin, manager |
| Cancellation rate | Cancelled ÷ confirmed bookings | admin, manager |
| Outstanding invoices | Unpaid invoice total and days overdue | admin |

Targets live in `kpi_targets`, by month and optionally per person or talent. A nightly scheduled function writes `kpi_snapshots` so trends survive edits to old records.

## 6. Delivery plan

Each phase ships on its own and is usable without the next one.

| Phase | Scope | Size | Depends on |
|---|---|---|---|
| **0. Foundation** ✅ built | Team roles + permission map; Team page with invite/reset links; talent assignments; login throttling; audit log; role-aware dashboard (see §9) | M | – |
| **1. CRM core** ✅ built | Organisations, contacts, deals pipeline board, activities/tasks, enquiry inbox (forms → DB) (see §10) | L | 0 |
| **2. Bookings & calendar** ✅ built (documents moved to 2b, see §11) | Bookings from deals, per-talent commission, client-visibility switch, holds, availability, **calendar (month/week/agenda, per talent or all)**, documents, clash detection | M | 1 |
| **3. Talent portal** ✅ built (see §12) | `/portal` login, home, own calendar, availability, net earnings, **event points + artist perks**, profile change requests | M | 0, 2 |
| **3b. Meetings & AI notes** | Meetings linked to deals/talents/bookings; paste a transcript or upload a recording → AI summary, decisions and action items that become tasks | M | 1 |
| **4. Outreach v1** | Campaigns, sequences, due-today tasks, templates, outcomes, compliance fields | M | 1 |
| **5. KPIs** | KPI queries, targets, snapshots, role-filtered KPI page, alerts on dashboard | S–M | 1, 2, 4 |
| **6. Finance (optional)** | Invoices and talent payouts; sync with the accounting package | M | 2 |
| **Later** | Outreach v2 (sending + tracking), e-signature for contracts, real profile-view analytics | – | – |

Suggested order: 0 → 1 → 2 → 3 → 3b → 4 → 5. The talent portal comes after bookings so it has real content on day one. Perks and points (part of 3) can ship early, since points already exist.

## 7. Build vs buy

An off-the-shelf CRM (e.g. HubSpot's free tier) could cover contacts and a pipeline, but not talent bookings, holds, availability, commission or a talent-facing portal. Those would still need building and syncing. With the data already in Neon and the auth and repository patterns already in place, **building in-house is the better fit**. If a team member already uses an external CRM, Phase 1 can import its contacts from CSV.

## 8. New features in detail

### 8.1 Bookings calendar (Phase 2)
- Month, week and agenda views. Filter by talent, or all of the viewer's talents. Status shown by colour (hold, confirmed, completed, cancelled).
- Click a day to create a booking, or drag to move one. Moving re-runs the clash check against other bookings and the talent's unavailable dates.
- Each person sees only what their role allows: road managers get times and logistics, talents get their own bookings, managers their assigned talents.
- **Calendar feed:** a private iCal link per person (`/api/calendar/<secret>.ics`) to subscribe from Google or Apple Calendar. The link is read-only and can be revoked and reissued.
- Public events (`events`) appear as a separate layer, so the team can see what's already announced.

### 8.2 Meetings with AI notes (Phase 3b)
```sql
CREATE TABLE meetings (id uuid PK, title text, starts_at timestamptz, ends_at timestamptz, location text,
  organisation_id uuid, deal_id uuid, booking_id uuid, talent_ids uuid[], attendees jsonb,
  transcript text, recording_blob_key text,
  ai_summary text, ai_decisions jsonb, ai_action_items jsonb, ai_generated_at timestamptz, ai_model text,
  notes text, shared_with_talent boolean DEFAULT false, created_by uuid, created_at, updated_at);
```
- Schedule meetings from a deal, organisation or talent, or log one afterwards.
- **AI notes:** paste a transcript (e.g. from Google Meet, Zoom or Otter) or upload an audio recording to be transcribed. The AI then writes:
  - a short summary,
  - decisions made,
  - action items with owner and due date.
  One click turns action items into tasks (`activities`) on the deal or talent. The person reviews and edits the notes before saving; the AI output is a draft.
- **Model:** Claude via the Anthropic API (`ANTHROPIC_API_KEY` as a server env var). Calls run server-side only, and the transcript isn't stored anywhere else.
- **Consent:** UK law expects participants to be told before a call is recorded. The upload form asks you to confirm everyone was told.
- Visibility follows the access matrix; a meeting can be shared with the talent it concerns.

### 8.3 Talent points & artist perks (Phase 3)
- **Points:** artists already earn points through the VIP system: check-ins at our events and purchases at the till. 3 artists hold memberships today. The portal shows their balance, lifetime points, tier, progress to the next tier, and a history of where points came from (`vip_points_log`).
- **Artist perks:** a new list the admin manages, separate from customer VIP tier benefits:
  ```sql
  CREATE TABLE artist_perks (id uuid PK, title text, description text, talent_id uuid NULL /* NULL = every artist */,
    min_tier text NULL /* optional: silver|gold|black */, valid_from date, valid_until date, is_active boolean DEFAULT true,
    sort_order int, created_at, updated_at);
  ```
  Admin screen: add, edit, reorder and switch off perks, for all artists or for one talent (e.g. "2 guest-list places at every VersaTalent event", "free studio session per quarter"). The talent's profile shows the perks that apply to them now.
- Point rules, tiers and customer benefits stay managed in the existing VIP section.

## 9. Phase 0: what was built

- **Roles:** `admin`, `manager`, `road_manager` added (migration `024_team_roles_and_access.sql`), plus `users.is_active` and `last_login_at`.
- **Team page** (`/admin/team`, admin only):
  - Add a person, choose their role and the talents they look after.
  - Deactivate someone (takes effect immediately).
  - Get one-time invite or reset links (7 days / 24 hours) to send them yourself.
- **Sign-in:** team members sign in at `/admin/login` with email and password. The env admin login still works as a fallback. Repeated failures are throttled (5 per email or 20 per IP in 15 minutes). The staff login is throttled too, and refuses deactivated accounts.
- **Enforcement:**
  - Existing sections (talents, events, content, NFC, VIP, POS) are admin-only server-side.
  - Manager and road-manager sessions can't reach the till or check-in tools.
  - Roles and active status are re-read on every request, so changes apply at once.
- **Dashboard:** managers and road managers see their assigned talents, those talents' upcoming events and alerts, with no sales figures.
- **Audit log:** team changes and link use are recorded in `audit_log`.

**Go-live order:** run migration 024 on production → deploy → sign in with the env admin → add yourself as Admin, the COO as Manager and the road manager as Road Manager (with the DJ assigned) → send their links.

## 10. Phase 1: what was built

Migration `025_crm_core.sql` adds `organisations`, `contacts`, `deals`, `activities` and `enquiries`.

**Screens (`/admin/crm`, for Admins and Managers; Road Managers are redirected):**
- **Pipeline:** a board by stage with drag-and-drop (a stage menu on phones). Shows open, weighted and recently won totals per currency. Flags overdue tasks and deals with no activity for 14 days.
- **Deal page:** stage buttons, details, contact, and a timeline. Log notes, calls, emails and meetings, or add tasks with a due date and owner. Stage moves are logged automatically.
- **Enquiries inbox:** website contact, brand and talent forms. Convert a message to a deal, reusing the contact (by email) and client (by name) if they exist, or archive it or mark it as spam. Talent applications can't become deals.
- **Clients:** organisations and people, with search and tags. Contacts record their GDPR lawful basis and a do-not-contact flag.
- **My tasks:** overdue, today, upcoming and recently done; mine or everyone's.

**Visibility:**
- Managers see deals they own or created, or that involve their assigned talents, plus the clients, contacts and activities around those deals.
- They can only add their own talents to a deal. Talents already on a deal stay when it's edited.
- Website enquiries are visible to Admins and Managers (permission `enquiries.view`), because they aren't tied to a talent yet.
- Only Admins can delete deals, clients and contacts. Notes can be deleted by whoever logged them.

**Website forms:** each submission still goes to Netlify Forms (email alerts) and now also to `/api/enquiries`. The form counts as sent if either accepts it. There's a hidden honeypot field (also registered with Netlify) and a limit of 5 messages per hour per IP.

**Dashboard:** new enquiries, your overdue tasks and quiet deals appear under "Needs attention", with CRM links for Admins and Managers.

**Go-live:** run migration 025 on production before deploying this code.

## 11. Phase 2: what was built

Migration `026_bookings_calendar.sql` adds `talents.commission_percent`, `bookings`, `talent_availability` and `calendar_feeds`.

**Calendar (`/admin/bookings`, all team roles):**
- Month, week and list views, with a talent filter.
- Holds are dashed, confirmed bookings green, completed grey and cancelled struck through.
- Unavailable days are striped. Public events can be shown as an optional ★ layer.
- Click a day to add a booking, or drag a booking to another day; times are kept and clashes are checked.

**Booking form:**
- Talent, status, times, location, link to a deal and client, on-site contact, brief, call time and logistics notes.
- Fee and commission %, with the agency's share and the talent's net worked out as you type.
- "Show to talent" switch, and "talent can see client's name" switch (default off).

**Commission rates (`/admin/bookings/rates`, Admin only):** one rate per talent. A new booking copies the current rate; changing a rate later doesn't change existing bookings.

**Clashes:** a booking that overlaps another hold or confirmed booking, or falls on an unavailable day (UK dates), gets a warning listing the clashes, with "Save anyway".

**Access:**

| | Admin | Manager | Road Manager |
|---|---|---|---|
| See bookings | all | assigned talents | assigned talents |
| Fees, commission, net | ✓ | ✓ | removed by the server |
| Create / edit / cancel | ✓ | ✓ | – |
| Call time & logistics notes | ✓ | ✓ | ✓ |
| Availability | ✓ | assigned | assigned |
| Client-visibility switch | ✓ | ✓ | – |
| Delete bookings, commission rates | ✓ | – | – |

**Calendar subscription:** a private iCal link per person (`/api/calendar/ics/<token>.ics`) for Google, Apple or Outlook. It covers bookings and unavailable days from 60 days back to a year ahead, never includes money, and can be revoked or reissued. It needs a personal account, not the env admin login.

**Links to the rest:**
- Deals have a Bookings card. "Add" is prefilled from the deal, and when there's one talent the deal value becomes the fee. Booking changes are logged on the deal's timeline.
- Dashboard: a "Next bookings" list for every role, a calendar link, and an alert for holds within 14 days.

**Moved to Phase 2b: documents** (contracts, riders, briefs). Current uploads are publicly readable by URL, so documents need a private store and a download route that checks access. That's worth building on its own.

**Go-live:** run migration 026 on production before deploying this code.

## 12. Phase 3: what was built

Migration `027_talent_portal.sql` adds `artist_perks` and `talent_profile_changes`.

**Sign-in:** talents use their existing `artist` account (linked by `users.talent_id`) at `/portal/login`. The portal has its own cookie (`talent_session`), which never counts as a team or staff session. Login, account and talent link are re-checked on every request, and sign-in is throttled like the other logins. The old `/dashboard` address redirects to `/portal`.

**Portal (`/portal`, mobile-first):**
- **Home:** bookings waiting for an answer, what's coming up, and points and perks.
- **Bookings:** upcoming and past. Shows times, place, call time, on-site contact, brief and logistics, and **net pay only**. The client's name appears only when that booking's switch is on. Talents answer "I'm in" or "Can't do it"; the answer goes on the deal's timeline, and a decline raises a dashboard alert.
- **Days off:** talents add or remove their own unavailable days, which show in the team calendar.
- **Earnings:** net earned this year, net still to come from confirmed bookings, and a per-booking list.
- **Rewards:**
  - points balance, tier, and progress to the next tier (from the existing VIP membership);
  - points history, with event names where known;
  - artist perks: tier-locked ones show as "Unlocks at Gold";
  - the tier's member benefits.
- **Profile:** propose changes to tagline, bio, location, skills and links; an Admin approves before they go live. Also: change password, and a private calendar link for their phone (no money; client's name only when allowed).

**Admin (`/admin/talent-portal`):**
- **Logins:** each talent's portal status. Create a login, send an invite or reset link, or turn access on or off.
- **Artist perks:** for all artists or one talent, with an optional minimum tier, dates, order, and a show/hide switch.
- **Profile requests:** approve (publishes through `updateTalent`, which clears caches) or reject with a note.

**Dashboard:** alerts for upcoming bookings a talent declined, and profile changes waiting for approval.

**Not included:** talents uploading photos or portfolio items (still done by the team), and payout status (Phase 6).

**Go-live:** run migration 027 on production before deploying. Then send each talent a link from Talent Portal → Logins. Seven talents already have passwords the team set earlier; sending them a reset link lets them choose their own.
