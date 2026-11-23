/*
 * Team service worker (scope /admin): shows admins', managers' and road
 * managers' phone notifications and opens the right admin page when one is
 * tapped. Nothing is cached. The talent portal has its own (portal-sw.js).
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
      data: { link: data.link || '/admin' },
    })
  );
});

// Take over open admin tabs straight away, so tapping a notification can move them to its page
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = new URL((event.notification.data && event.notification.data.link) || '/admin', self.location.origin);
  // Only ever open admin pages on this site
  const target = link.origin === self.location.origin && link.pathname.startsWith('/admin') ? link.href : new URL('/admin', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).pathname.startsWith('/admin'));
      if (!open) return self.clients.openWindow(target);
      // navigate() fails for a tab this worker doesn't control yet: open a new one instead
      return open
        .focus()
        .then((w) => (w ? w.navigate(target) : null))
        .then((w) => w || self.clients.openWindow(target))
        .catch(() => self.clients.openWindow(target));
    })
  );
});
