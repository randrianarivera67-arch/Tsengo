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

messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification;
  const link = payload.fcmOptions?.link || '/';
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    data: { link },
  });
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  event.waitUntil(clients.openWindow(link));
});
