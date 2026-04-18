// src/utils/onesignal.js

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://tsengo-backend.onrender.com';
// ✅ FIX: Secret shared between frontend and backend to protect /notify endpoint
const NOTIFY_SECRET = import.meta.env.VITE_NOTIFY_SECRET || '';

export function setOneSignalExternalId(uid) {
  try {
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(function(OneSignal) {
        OneSignal.login(uid);
      });
    }
  } catch (e) {
    console.warn('OneSignal setExternalId failed:', e);
  }
}

export function removeOneSignalExternalId() {
  try {
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(function(OneSignal) {
        OneSignal.logout();
      });
    }
  } catch (e) {
    console.warn('OneSignal logout failed:', e);
  }
}

export function requestNotificationPermission() {
  try {
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(function(OneSignal) {
        OneSignal.Notifications.requestPermission();
      });
    }
  } catch (e) {
    console.warn('OneSignal requestPermission failed:', e);
  }
}

// ✅ FIX: Include x-notify-secret header in every call
export async function sendPushNotification({ toExternalId, title, message, data }) {
  if (!toExternalId || !NOTIFY_SECRET) return;
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
    console.warn('Push notification failed (non-critical):', err);
  }
}
