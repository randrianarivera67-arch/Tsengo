// Trengo — Service Worker FCM
// Ny "notification" payload dia asehon'ny SDK ho azy (na mikatona tanteraka aza
// ny app) — ka TSY mampiseho intsony ity SW ity (tsy misy doublon).
// Ny listener notificationclick dia soratana ALOHAN'ny firebase mba ho izy no
// voalohany mandray (stopImmediatePropagation = tsy mandray intsony ny an'ny SDK).

const BACKEND_URL = 'https://tsengo-backend.onrender.com';

function extractData(notification) {
  const raw = notification.data || {};
  // Auto-affiché par le SDK : ny payload dia ao amin'ny data.FCM_MSG
  if (raw.FCM_MSG) return raw.FCM_MSG.data || {};
  return raw;
}

self.addEventListener('notificationclick', function (event) {
  event.stopImmediatePropagation();   // sakanana ny handler an'ny SDK (doublon d'ouverture)
  const d = extractData(event.notification);

  // ✍️ Répondre mivantana (inline reply) — tsy mila manokatra ny app
  if (event.action === 'reply') {
    const text = (event.reply || '').trim();
    event.notification.close();
    if (!text) return;
    event.waitUntil(
      fetch(BACKEND_URL + '/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-notify-secret': d.ns || '' },
        body: JSON.stringify({
          conversationId: d.conversationId || '',
          meUid: d.meUid || '',
          otherUid: d.otherUid || '',
          text,
        }),
      }).then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return self.registration.showNotification('Trengo ✓', {
          body: 'Réponse envoyée : ' + text.slice(0, 60),
          icon: '/icon-192.png', badge: '/icon-96.png', tag: 'reply_ok',
        });
      }).catch(() =>
        self.registration.showNotification('Trengo ⚠️', {
          body: "Échec de l'envoi — ouvrez l'app pour répondre",
          icon: '/icon-192.png', tag: 'reply_fail',
        })
      )
    );
    return;
  }

  // ✖️ Fermer : akatona fotsiny
  if (event.action === 'close') {
    event.notification.close();
    return;
  }

  // Clic tsotra / Voir : sokafy ny app amin'ilay pejy
  event.notification.close();
  const link = d.url || d.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin)) {
          c.focus();
          return c.navigate ? c.navigate(link) : null;
        }
      }
      return clients.openWindow(link);
    })
  );
});

self.addEventListener('notificationclose', function () {});

// ── Firebase (aorian'ny listeners) : mampiseho ho azy ny notifications background ──
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBAWMCviG_3t5zsZaffmyGVmfVys9jLjno",
  authDomain: "tsengo.firebaseapp.com",
  projectId: "tsengo",
  storageBucket: "tsengo.firebasestorage.app",
  messagingSenderId: "346673250242",
  appId: "1:346673250242:web:b1b826f630c443f144e05b",
});
firebase.messaging();   // mandray ny push sy mampiseho ho azy — tsy misy onBackgroundMessage


/* ── TRENGO_PWA_FETCH : nécessaire pour l'installabilité PWA + offline léger ──
 * Chrome n'affiche "Installer" que si le SW possède un handler 'fetch'.
 * On intercepte UNIQUEMENT les navigations (network-first, cache de secours).
 * Les assets (chunks JS hashés) passent au réseau → pas de chunk périmé. */
const TRENGO_CACHE = 'trengo-shell-v1';
self.addEventListener('install',  (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  event.respondWith(
    fetch(req)
      .then((res) => { const c = res.clone(); caches.open(TRENGO_CACHE).then((k) => k.put('/', c)); return res; })
      .catch(() => caches.match('/'))
  );
});
