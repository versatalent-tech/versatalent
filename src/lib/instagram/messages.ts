/** What ?instagram=<result> means after connecting (see /api/instagram/oauth/callback) */
export const CONNECT_RESULTS: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: 'Instagram connected. The first figures appear in a few minutes.' },
  cancelled: { ok: false, text: 'Connecting was cancelled. Nothing was shared.' },
  expired_link: { ok: false, text: 'That link expired. Try connecting again.' },
  signed_out: { ok: false, text: 'You were signed out. Sign in and try again.' },
  missing_permission: {
    ok: false,
    text: 'Instagram didn’t give permission to see insights, so nothing was saved. Try again and leave both permissions switched on.',
  },
  linked_elsewhere: { ok: false, text: 'That Instagram account is already connected to another profile.' },
  other_account: { ok: false, text: 'A different Instagram account is connected. Disconnect it first.' },
  not_set_up: { ok: false, text: 'Connecting Instagram isn’t switched on yet.' },
  failed: { ok: false, text: 'Couldn’t connect to Instagram. Please try again.' },
};

/** Reads ?instagram=… once, then removes it from the address bar */
export function takeConnectResult(): { ok: boolean; text: string } | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const key = url.searchParams.get('instagram');
  if (!key) return null;
  url.searchParams.delete('instagram');
  window.history.replaceState(null, '', url.toString());
  return CONNECT_RESULTS[key] ?? CONNECT_RESULTS.failed;
}
