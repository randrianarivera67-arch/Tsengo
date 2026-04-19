import { getMessaging, getToken } from 'firebase/messaging';
import app from '../firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://tsengo-backend.onrender.com';
const NOTIFY_SECRET = import.meta.env.VITE_NOTIFY_SECRET || '';
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BLoU1a4EyNtaEqxPW_rsMhmf7woTnFfVUGusmpmkKY3ULFSYYUq1vsnLtfqn85LduhxFCCmwPBSMog_FlOVZt5k';

async function getFCMToken() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    alert('FCM TOKEN: ' + token);
    return token;
  } catch (e) {
    console.warn('FCM token failed:', e);
    return null;
  }
}

export async function requestNotificationPermission() {
  return await getFCMToken();
}

export function setOneSignalExternalId(uid) {}
export function removeOneSignalExternalId() {}

export async function sendPushNotification({ toExternalId, title, message, data }) {
  if (!toExternalId) return;
  try {
    await fetch(`${BACKEND_URL}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-notify-secret': NOTIFY_SECRET,
      },
      body: JSON.stringify({ toExternalId, title, message, data }),
    });
  } catch (err) {
    console.warn('Push notification failed:', err);
  }
}

export async function subscribeToFCMTopic(uid) {
  try {
    const token = await getFCMToken();
    if (!token) return;
    await fetch(`${BACKEND_URL}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-notify-secret': NOTIFY_SECRET,
      },
      body: JSON.stringify({ token, uid }),
    });
  } catch (e) {
    console.warn('FCM subscribe failed:', e);
  }
}
