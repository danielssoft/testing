/*
 * Push, in the service worker. Pulled into the generated worker with
 * `importScripts` (see vite.config.ts), so the precaching stays generated.
 *
 * A notification is shown only when no window of the app is on screen: an
 * open app announces things itself, from the live stream, and a second copy
 * from here would be the same news twice. Tapping one opens the app where the
 * news is, or brings an open window there.
 */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (_) {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      if (windows.some((client) => client.visibilityState === 'visible')) return undefined
      return self.registration.showNotification(data.title || 'English Bread', {
        body: data.body || '',
        tag: data.tag || undefined,
        icon: 'icons/icon-alt-192.png',
        badge: 'icons/icon-alt-192.png',
        data: { route: data.route || '' },
      })
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const route = (event.notification.data && event.notification.data.route) || ''
  const target = new URL(self.registration.scope)
  target.hash = route.replace(/^#/, '')
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows[0]
      if (open) {
        open.navigate(target.href).catch(() => undefined)
        return open.focus()
      }
      return self.clients.openWindow(target.href)
    })
  )
})
