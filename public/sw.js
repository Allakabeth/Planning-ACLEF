/**
 * Service Worker de nettoyage
 * Se désinstalle automatiquement et supprime tous les caches
 */

self.addEventListener('install', (event) => {
  console.log('[SW] Désinstallation en cours...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Nettoyage des caches...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('[SW] Suppression cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        console.log('[SW] Désinstallation du Service Worker...');
        return self.registration.unregister();
      })
      .then(() => {
        console.log('[SW] Service Worker désinstallé avec succès');
        // Forcer le rechargement de tous les clients
        return self.clients.matchAll();
      })
      .then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UNINSTALLED' });
        });
      })
  );
});

console.log('[SW] Service Worker de nettoyage chargé');
