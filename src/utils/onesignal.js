import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import app from '../firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://tsengo-backend.onrender.com';
const NOTIFY_SECRET = import.meta.env.VITE_NOTIFY_SECRET || '';
const VAPID_KEY = 'BAZ7EZHTxCKO-FkGtFcggv5JSlwrxWfLS4MfkGXdbEGVgWa9nVFklOEbqqB-z3Zdjc4uE7GcXnK1-TYPOwqwifI';

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    alert("FCM TOKEN: " + token);
    return token;
  } catch (e) {
    console.warn('FCM permission failed:', e);
    return null;
  }
}

export function setOneSignalExternalId(uid) {
  // tsy ampiasaina intsony — FCM topic no ampiasaina
}

export function removeOneSignalExternalId() {
  // tsy ampiasaina intsony
}

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
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
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
