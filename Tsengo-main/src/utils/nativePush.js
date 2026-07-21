// src/utils/nativePush.js
// Push NATIF (APK) via @capacitor/push-notifications + FCM.
// IMPORT STATIQUE (le package est installé) → pas de chunk dynamique qui
// pourrait bloquer dans la WebView. register() a un timeout → jamais figé,
// et toute erreur est capturée dans lastError (visible dans le diagnostic).
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://tsengo-backend.onrender.com';
const NOTIFY_SECRET = import.meta.env.VITE_NOTIFY_SECRET || '';
const CHANNEL_ID = 'trengo_default';
const CHANNEL_MSG = 'trengo_messages';

let currentUid = null;
let currentToken = null;
let lastError = null;
let listenersAdded = false;

function routeFor(data = {}) {
  if (data.url) return data.url;
  if (data.link) return data.link;
  const { type, postId, conversationId } = data;
  if (postId && ['comment', 'reaction', 'post', 'boost', 'mention', 'share'].includes(type)) return `/post/${postId}`;
  if (type === 'message') return conversationId ? `/messages/${conversationId}` : '/messages';
  if (type === 'friendRequest' || type === 'friendAccepted') return '/friends';
  return '/notifications';
}

export async function initNativePush(uid) {
  if (!Capacitor.isNativePlatform() || !uid) return;
  currentUid = uid;
  lastError = 'init…';
  try {
    // Canal (Android 8+)
    try {
      await PushNotifications.createChannel({
        id: CHANNEL_ID, name: 'Trengo', description: 'Notifications Trengo',
        importance: 5, visibility: 1, vibration: true, lights: true,
      });
    } catch (e) { /* ignore */ }

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') { lastError = 'permission: ' + perm.receive; return; }

    if (!listenersAdded) {
      listenersAdded = true;
      await PushNotifications.addListener('registration', (token) => {
        currentToken = token.value;
        lastError = null;
        if (currentUid) {
          updateDoc(doc(db, 'users', currentUid), { fcmTokens: arrayUnion(token.value) })
            .catch((e) => { lastError = 'save token: ' + (e && e.message); });
        }
      });
      await PushNotifications.addListener('registrationError', (err) => {
        lastError = 'registrationError: ' + ((err && err.error) || JSON.stringify(err));
      });
      await PushNotifications.addListener('pushNotificationReceived', () => { /* premier plan */ });
      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        try { window.location.href = routeFor((action && action.notification && action.notification.data) || {}); } catch (e) {}
      });
    }

    lastError = 'register() appelé, attente token…';
    await PushNotifications.register();

    // Si aucun token après 8s et pas d'erreur → le signaler (Play Services / plugin natif ?)
    setTimeout(() => {
      if (!currentToken && String(lastError || '').indexOf('registrationError') === -1) {
        lastError = 'timeout: register() ok mais aucun token (FCM/Play Services/plugin natif ?)';
      }
    }, 8000);
  } catch (e) {
    lastError = 'init: ' + ((e && e.message) || String(e));
  }
}

export async function removeNativePush() {
  try {
    if (Capacitor.isNativePlatform() && currentUid && currentToken) {
      await updateDoc(doc(db, 'users', currentUid), { fcmTokens: arrayRemove(currentToken) }).catch(() => {});
    }
  } catch (e) { /* ignore */ }
  currentUid = null;
  currentToken = null;
}

export function getNativeToken() { return currentToken; }
export function getLastError() { return lastError; }

export async function getPushState() {
  const state = {
    native: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
    permission: '?',
    hasToken: !!currentToken,
    token: currentToken ? (currentToken.slice(0, 16) + '…') : null,
    error: lastError,
    backend: BACKEND_URL,
    hasSecret: !!NOTIFY_SECRET,
  };
  try {
    if (state.native) {
      const r = await Promise.race([
        PushNotifications.checkPermissions(),
        new Promise((res) => setTimeout(() => res({ receive: 'timeout' }), 3000)),
      ]);
      state.permission = r && r.receive ? r.receive : 'inconnu';
    } else if (typeof Notification !== 'undefined') {
      state.permission = Notification.permission;
    }
  } catch (e) { state.error = (e && e.message) || String(e); }
  return state;
}

export async function sendTestPush(uid) {
  try {
    const r = await fetch(`${BACKEND_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-notify-secret': NOTIFY_SECRET },
      body: JSON.stringify({ toExternalId: uid, title: 'Trengo 🔔', message: 'Test de notification — ça marche !', data: { type: 'test', url: '/notifications' } }),
    });
    const body = await r.text().catch(() => '');
    return { ok: r.ok, status: r.status, body: body.slice(0, 300) };
  } catch (e) {
    return { ok: false, status: 0, body: (e && e.message) || String(e) };
  }
}
