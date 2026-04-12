// src/utils/onesignal.js
// OneSignal Push Notifications utility
// REST API Key dia ao amin'ny Render Environment Variables IHANY — tsy asiana code

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

/**
 * Alefa notification any amin'ny user iray
 * Atao avy amin'ny Firestore Cloud Function na Render backend
 * Eto dia mampiasa OneSignal REST API mivantana (ho an'ny dev/test)
 */
export async function sendPushNotification({ toExternalId, title, message, data = {} }) {
  try {
    const REST_API_KEY = import.meta.env.VITE_ONESIGNAL_REST_API_KEY;
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: { external_id: [toExternalId] },
        target_channel: 'push',
        headings: { en: title, fr: title, mg: title },
        contents: { en: message, fr: message, mg: message },
        data,
        // Sound
        ios_sound: 'notification.wav',
        android_sound: 'notification',
        android_channel_id: 'tsengo_notifications',
        // Icon
        chrome_web_icon: '/tsengo-icon-192.png',
        firefox_icon: '/tsengo-icon-192.png',
        // Badge
        android_badge_type: 'Increase',
        android_badge_count: 1,
      }),
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('OneSignal error:', err);
  }
}

/**
 * Mametraka ny external_id (Firebase UID) ho an'ny OneSignal
 * Atao rehefa login ny user
 */
export function setOneSignalExternalId(uid) {
  if (window.OneSignalDeferred) {
    window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.login(uid);
    });
  }
}

/**
 * Esorina ny external_id rehefa logout
 */
export function removeOneSignalExternalId() {
  if (window.OneSignalDeferred) {
    window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.logout();
    });
  }
}

/**
 * Mangataka permission push notification
 */
export function requestNotificationPermission() {
  if (window.OneSignalDeferred) {
    window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.Notifications.requestPermission();
    });
  }
}
