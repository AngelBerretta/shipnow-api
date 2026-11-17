/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

// Mismo comportamiento que antes (generateSW): precache del shell y fallback SPA, sin tocar /api.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }));

// registerType 'autoUpdate': el service worker nuevo toma el control apenas se instala.
void self.skipWaiting();
clientsClaim();

interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = { title: 'Ruvika' };
  try {
    payload = event.data?.json() ?? payload;
  } catch {
    /* payload no JSON: se muestra el aviso genérico */
  }
  // En iOS y Chrome cada push debe mostrar una notificación (userVisibleOnly).
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      data: { url: payload.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? '/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows[0];
      if (open) {
        try {
          await (await open.navigate(url))?.focus();
          return;
        } catch {
          /* si el navegador no deja navegar la ventana, se abre una nueva */
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});