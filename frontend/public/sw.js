/**
 * Service Worker pour la gestion hors ligne de l'application de présence
 */

const CACHE_NAME = 'presence-app-v1';
const OFFLINE_URL = '/offline.html';

// Ressources à mettre en cache
const CACHE_URLS = [
  '/',
  '/presence',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Ajouter d'autres ressources critiques
];

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        // Forcer l'activation immédiate
        return self.skipWaiting();
      })
  );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Prendre le contrôle de tous les clients
      return self.clients.claim();
    })
  );
});

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes vers des domaines externes
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retourner la réponse du cache si disponible
        if (response) {
          return response;
        }

        // Sinon, essayer de récupérer depuis le réseau
        return fetch(event.request)
          .then((response) => {
            // Vérifier si la réponse est valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cloner la réponse pour la mettre en cache
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // En cas d'échec réseau, retourner la page hors ligne pour les pages HTML
            if (event.request.destination === 'document') {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('Push message received:', event);

  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'Notification',
        body: event.data.text() || 'Nouvelle notification'
      };
    }
  }

  const options = {
    body: notificationData.body || 'Nouvelle notification',
    icon: notificationData.icon || '/icons/icon-192x192.png',
    badge: notificationData.badge || '/icons/badge-72x72.png',
    tag: notificationData.tag || 'default',
    data: notificationData.data || {},
    actions: notificationData.actions || [],
    requireInteraction: notificationData.requireInteraction || false,
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'AttendanceX',
      options
    )
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  event.waitUntil(
    handleNotificationAction(action, data)
  );
});

// Gestion des actions des notifications
async function handleNotificationAction(action, data) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  // Trouver un client existant ou en ouvrir un nouveau
  let client = clients.find(c => c.url.includes('/presence'));
  
  if (!client) {
    client = clients[0];
  }

  let targetUrl = '/presence';

  switch (action) {
    case 'clock-in':
      targetUrl = '/presence?action=clock-in';
      break;
    case 'clock-out':
      targetUrl = '/presence?action=clock-out';
      break;
    case 'end-break':
      targetUrl = '/presence?action=end-break';
      break;
    case 'view-schedule':
      targetUrl = '/schedule';
      break;
    case 'view-leaves':
      targetUrl = '/leaves';
      break;
    default:
      // Action par défaut ou clic sur la notification
      if (data.url) {
        targetUrl = data.url;
      }
  }

  if (client) {
    // Naviguer vers l'URL cible
    await client.navigate(targetUrl);
    return client.focus();
  } else {
    // Ouvrir une nouvelle fenêtre
    return self.clients.openWindow(targetUrl);
  }
}

// Synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'presence-sync') {
    event.waitUntil(syncPresenceData());
  }
});

// Fonction de synchronisation des données de présence
async function syncPresenceData() {
  try {
    // Récupérer les données en attente depuis IndexedDB ou localStorage
    const pendingData = await getPendingPresenceData();
    
    if (pendingData.length === 0) {
      return;
    }

    console.log(`Syncing ${pendingData.length} presence entries...`);

    // Synchroniser chaque entrée
    const syncPromises = pendingData.map(entry => syncPresenceEntry(entry));
    const results = await Promise.allSettled(syncPromises);

    // Traiter les résultats
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Synced entry ${pendingData[index].id}`);
        markEntryAsSynced(pendingData[index].id);
      } else {
        console.error(`Failed to sync entry ${pendingData[index].id}:`, result.reason);
      }
    });

  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Récupérer les données en attente
async function getPendingPresenceData() {
  try {
    const stored = localStorage.getItem('offline_presence_queue');
    const queue = stored ? JSON.parse(stored) : [];
    return queue.filter(entry => !entry.synced);
  } catch (error) {
    console.error('Failed to get pending data:', error);
    return [];
  }
}

// Synchroniser une entrée de présence
async function syncPresenceEntry(entry) {
  const response = await fetch('/api/presence/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entry)
  });

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }

  return response.json();
}

// Marquer une entrée comme synchronisée
function markEntryAsSynced(entryId) {
  try {
    const stored = localStorage.getItem('offline_presence_queue');
    const queue = stored ? JSON.parse(stored) : [];
    
    const entryIndex = queue.findIndex(entry => entry.id === entryId);
    if (entryIndex !== -1) {
      queue[entryIndex].synced = true;
      localStorage.setItem('offline_presence_queue', JSON.stringify(queue));
    }
  } catch (error) {
    console.error('Failed to mark entry as synced:', error);
  }
}

// Gestion des messages depuis l'application principale
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SYNC_PRESENCE') {
    // Déclencher une synchronisation manuelle
    syncPresenceData();
  }
});

// Nettoyage périodique du cache
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupCache());
  }
});

// Fonction de nettoyage du cache
async function cleanupCache() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  
  // Supprimer les entrées anciennes (plus de 7 jours)
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  const deletePromises = requests.map(async (request) => {
    const response = await cache.match(request);
    if (response && response.headers.get('date')) {
      const responseDate = new Date(response.headers.get('date')).getTime();
      if (responseDate < oneWeekAgo) {
        return cache.delete(request);
      }
    }
  });

  await Promise.all(deletePromises);
  console.log('Cache cleanup completed');
}