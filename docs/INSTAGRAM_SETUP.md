# Instagram: connecting accounts for figures

How to switch on "Connect Instagram" (talent portal) and the nightly figures
(Admin → Instagram). About 30 minutes, once. Meta's screens change often: if a
label below doesn't match exactly, look for the nearest equivalent.

**What the site can access:** only basic profile data and insights
(`instagram_business_basic`, `instagram_business_manage_insights`). Never
messages, never comment text, never posting. This is fixed in the code
(`src/lib/instagram/scopes.ts`) and checked by a test.

The addresses below use `https://versatalent.netlify.app`. If the site moves to
its own domain, use that instead everywhere (and set `NEXT_PUBLIC_SITE_URL` in
Netlify).

## 1. Create the Meta app

1. Go to <https://developers.facebook.com/apps> and log in with Facebook. If
   asked, register as a developer (free).
2. **Create app**. Choose the use case for the **Instagram API** (currently
   called something like "Manage messaging & content on Instagram"; despite the
   name, we only switch on the two permissions below). App type: **Business**.
3. Name it **VersaTalent**, contact email `versatalent.management@gmail.com`.

## 2. Permissions: only these two

In the app, open the Instagram use case → **Permissions and features** (or
"Customize"), and make sure **only** these are added:

- `instagram_business_basic`
- `instagram_business_manage_insights`

If `instagram_business_manage_messages`, `instagram_business_manage_comments`
or `instagram_business_content_publish` are listed as added, **remove them**.
(The site never asks for them anyway, but there's no reason for the app to
have them.)

## 3. Business login settings

Instagram → **API setup with Instagram business login** → **Set up Instagram
business login** (or "Business login settings"):

| Field | Value |
| --- | --- |
| OAuth redirect URIs | `https://versatalent.netlify.app/api/instagram/oauth/callback` |
| Deauthorize callback URL | `https://versatalent.netlify.app/api/instagram/deauthorize` |
| Data deletion request URL | `https://versatalent.netlify.app/api/instagram/data-deletion` |

Save. On the same page, note the **Instagram app ID** and **Instagram app
secret** (click Show). These are *not* the same as the Meta app ID at the top
of the dashboard: use the Instagram ones.

## 4. App details

App settings → **Basic**:

- Privacy policy URL: `https://versatalent.netlify.app/privacy`
- User data deletion: `https://versatalent.netlify.app/api/instagram/data-deletion`
- App icon and category (e.g. "Business and pages")

Save.

## 5. Add the accounts as Instagram testers

The app stays in **Development** mode with **Standard Access**, which works for
accounts added to the app. That avoids Meta's App Review.

1. App roles → **Roles** → **Add people** → **Instagram Tester**, and add
   `versatalent` and each talent's Instagram username.
2. Each account accepts its invite: on the web at
   <https://www.instagram.com/accounts/manage_access/> → **Tester invites** →
   Accept (or in the app: Settings → Website permissions → Apps and websites →
   Tester invites).

Every account must be a **Creator or Business** account (Instagram: Settings →
Account type and tools).

## 6. Netlify environment variables

Netlify → the site → **Site configuration → Environment variables** → Add,
with scope **All** (functions need them):

| Name | Value |
| --- | --- |
| `INSTAGRAM_APP_ID` | the Instagram app ID from step 3 |
| `INSTAGRAM_APP_SECRET` | the Instagram app secret from step 3 (mark it secret) |
| `INSTAGRAM_TOKEN_KEY` | 32 random bytes, base64: run `openssl rand -base64 32` in Terminal and paste the result (mark it secret) |

Keep `INSTAGRAM_TOKEN_KEY` safe and don't change it: stored access is
encrypted with it, and changing it means everyone has to connect again.

Then **Deploys → Trigger deploy** so the site picks them up.

## 7. Connect

- **VersaTalent:** Admin → Instagram → **Connect VersaTalent's account**, log
  in as @versatalent, approve.
- **Talents:** each signs in to the portal → **Profile** → **Instagram** →
  **Connect Instagram**. Instagram shows exactly what's shared before they
  agree.

Figures appear a few minutes after connecting, then update every night.
Access renews itself; if it ever lapses, the account shows "Needs
reconnecting" and the talent sees a "Connect again" button.

## Troubleshooting

| What you see | Usually means |
| --- | --- |
| Instagram shows an error straight after "Connect" | The account isn't an accepted Instagram tester (step 5), or the redirect URI doesn't match exactly (step 3) |
| "Instagram didn't give permission to see insights" | A permission was switched off on Instagram's screen; connect again and leave both on |
| "That link expired" | More than 10 minutes passed, or connecting was started on a different address (e.g. a deploy preview); connect from the live site |
| "Not switched on yet" in Admin → Instagram | The Netlify variables are missing, or the site wasn't redeployed after adding them |
| No figures for an account with very few followers | Instagram doesn't give some figures for accounts under 100 followers |
