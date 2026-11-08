/*
 * Talent portal service worker (scope /portal): shows phone notifications
 * and opens the right portal page when one is tapped. Nothing is cached.
 */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'VersaTalent', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'VersaTalent', {
      body: data.body || '',
      icon: '/apple-touch-icon.png',
      badge: '/favicon-32.png',
      data: { link: data.link || '/portal' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = new URL((event.notification.data && event.notification.data.link) || '/portal', self.location.origin);
  // Only ever open portal pages on this site
  const target = link.origin === self.location.origin && link.pathname.startsWith('/portal') ? link.href : new URL('/portal', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).pathname.startsWith('/portal'));
      if (open) return open.focus().then((w) => (w ? w.navigate(target) : self.clients.openWindow(target)));
      return self.clients.openWindow(target);
    })
  );
});
