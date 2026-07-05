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

const messaging = firebase.messaging();
const BACKEND_URL = 'https://tsengo-backend.onrender.com';

// Data-only : ny SW irery no mampiseho — sarin'ilay olona + bouton Répondre
messaging.onBackgroundMessage(function (payload) {
  const d = payload.data || {};
  const actions = [];
  if (d.canReply === '1') {
    actions.push({ action: 'reply', type: 'text', title: 'Répondre', placeholder: 'Votre message...' });
  }
  actions.push({ action: 'open', title: 'Ouvrir' });

  self.registration.showNotification(d.title || 'Traingo', {
    body: d.body || '',
    icon: d.icon || '/icon-192.png',        // ← sarin'ilay olona mandefa
    badge: '/icon-96.png',
    vibrate: [250, 120, 250],
    tag: d.type === 'message' ? 'msg_' + (d.conversationId || '') : undefined,
    renotify: d.type === 'message',
    actions,
    data: {
      link: d.url || '/',
      conversationId: d.conversationId || '',
      meUid: d.meUid || '',
      otherUid: d.otherUid || '',
    },
  });
});

self.addEventListener('notificationclick', function (event) {
  const data = event.notification.data || {};

  // ✍️ Réponse mivantana eo amin'ny notification (tsy miditra app)
  if (event.action === 'reply') {
    const text = (event.reply || '').trim();
    event.notification.close();
    if (!text) return;
    event.waitUntil(
      fetch(BACKEND_URL + '/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: data.conversationId,
          meUid: data.meUid,
          otherUid: data.otherUid,
          text,
        }),
      }).then(() =>
        self.registration.showNotification('Traingo ✓', {
          body: 'Réponse envoyée : ' + text.slice(0, 60),
          icon: '/icon-192.png',
          badge: '/icon-96.png',
          tag: 'reply_ok',
        })
      ).catch(() =>
        self.registration.showNotification('Traingo ⚠️', {
          body: "Échec de l'envoi — ouvrez l'app pour répondre",
          icon: '/icon-192.png',
          tag: 'reply_fail',
        })
      )
    );
    return;
  }

  // Clic tsotra / Ouvrir : sokafy (na avereno afovoany) ny app amin'ilay discussion
  event.notification.close();
  const link = data.link || '/';
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
