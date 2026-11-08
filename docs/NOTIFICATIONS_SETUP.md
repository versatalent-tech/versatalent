# Talent notifications: setup

Talents get notifications in the portal (the bell) and, if they switch it on, on their phone. The bell works without any setup. Phone notifications need three Netlify environment variables.

Design: `docs/superpowers/specs/2026-11-08-talent-notifications-design.md`.

## 1. Make the keys (once)

On your Mac, in the project folder:

```bash
npx web-push generate-vapid-keys
```

It prints a **Public Key** and a **Private Key**. Keep the private key secret: don't commit it, paste it into chat or email it. If it leaks, make a new pair (everyone then switches notifications on again).

## 2. Add them in Netlify

Site configuration → Environment variables → Add a variable, with **Functions** in the scopes:

| Key | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | the Public Key |
| `VAPID_PRIVATE_KEY` | the Private Key |
| `VAPID_SUBJECT` | `mailto:` followed by an address push services can contact, e.g. `mailto:info@versatalent.com` |

Then Deploys → Trigger deploy → Deploy site.

## 3. Check it

- **Android (Chrome):** sign in to the portal, tap **Turn on** on the home page, allow notifications. Ask the team to give that talent a test to-do: a notification should arrive within a few seconds.
- **iPhone (iOS 16.4 or later):** in Safari, Share → Add to Home Screen, open VersaTalent from the Home Screen, sign in, tap **Turn on**. Notifications only work from the Home Screen app.
- **Reminders:** the `talent-reminders` scheduled function runs hourly. Bookings are reminded at 10:00 UK time the day before (shared and confirmed only), tasks at 09:00 the day before they're due. Its runs show in Netlify → Logs → Functions.

## What talents are told

New to-dos and to-dos due tomorrow; bookings shared, confirmed, changed (time, location, call time), cancelled or moved to another talent, and the day before; profile changes approved or not; documents shared with them; payments recorded. Bookings that aren't shared with the talent never notify, client names only appear when the booking allows it, and amounts only appear in payment notifications (the net paid).
