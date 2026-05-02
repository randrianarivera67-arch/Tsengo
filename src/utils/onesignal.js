const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://tsengo-backend.onrender.com';
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

export function subscribeToFCMTopic(uid) {
  // tsy ampiasaina intsony
}

export async function sendPushNotification({ toExternalId, title, message, data, fromPhoto }) {
  if (!toExternalId) return;
  try {
    await fetch(`${BACKEND_URL}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-notify-secret': NOTIFY_SECRET,
      },
      body: JSON.stringify({ toExternalId, title, message, data, fromPhoto }),
    });
  } catch (err) {
    console.warn('Push notification failed:', err);
  }
}
