/**
 * Dedicated Native Web Push Service Worker
 * Kept on /push/ scope so it does not conflict with the main PWA worker.
 */

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: 'De 12e Man', body: event.data.text() };
  }

  const title = payload.title || 'De 12e Man';
  const options = {
    body: payload.body || payload.message || '',
    icon: payload.icon || '/pwa-192.png',
    badge: '/pwa-192.png',
    data: {
      url: payload.url || '/dashboard',
    },
    vibrate: [100, 50, 100],
    tag: payload.tag || payload.type || 'default',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const url = event.notification.data?.url || '/dashboard';
  const fullUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});
