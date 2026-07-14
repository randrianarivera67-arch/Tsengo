// src/utils/nativePush.js
// Push notifications NATIVES (APK) via @capacitor/push-notifications + FCM.
// Le token natif est enregistré dans users/{uid}.fcmTokens (même champ que le
// push web) → le backend Render (/notify → firebase-admin) délivre au natif.
// Ajout : création d'un canal de notification (obligatoire Android 8+),
// diagnostic (getPushState) et test (sendTestPush) pour le panel admin.
import { Capacitor } from '@capacitor/core';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://tsengo-backend.onrender.com';
const NOTIFY_SECRET = import.meta.env.VITE_NOTIFY_SECRET || '';
const CHANNEL_ID = 'trengo_default';

let currentUid = null;
let currentToken = null;
let lastError = null;
let listenersAdded = false;

async function getPlugin() {
  const mod = await import('@capacitor/push-notifications');
  return mod.PushNotifications;
}

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
  try {
    const PushNotifications = await getPlugin();

    // Canal (Android 8+) — sans lui, les notifications peuvent ne pas s'afficher
    try {
      await PushNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'Trengo',
        description: 'Notifications Trengo',
        importance: 5,        // HIGH → bannière + son
        visibility: 1,
        vibration: true,
        lights: true,
      });
    } catch (e) { /* certains appareils : ignore */ }

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') { lastError = 'permission: ' + perm.receive; return; }

    if (!listenersAdded) {
      listenersAdded = true;

      PushNotifications.addListener('registration', (token) => {
        currentToken = token.value;
        lastError = null;
        if (currentUid) {
          updateDoc(doc(db, 'users', currentUid), { fcmTokens: arrayUnion(token.value) }).catch((e) => { lastError = 'save token: ' + (e && e.message); });
        }
      });

      PushNotifications.addListener('registrationError', (err) => {
        lastError = 'registration: ' + ((err && err.error) || JSON.stringify(err));
        console.warn('Push registration error:', err);
      });

      PushNotifications.addListener('pushNotificationReceived', () => { /* premier plan : cloche in-app via Firestore */ });

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        try {
          const data = (action && action.notification && action.notification.data) || {};
          window.location.href = routeFor(data);
        } catch (e) { /* ignore */ }
      });
    }

    await PushNotifications.register();
  } catch (e) {
    lastError = 'init: ' + ((e && e.message) || e);
    console.warn('initNativePush failed:', lastError);
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

// ── Diagnostic (panel admin) ────────────────────────────────────────────────
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
      const P = await getPlugin();
      const r = await Promise.race([P.checkPermissions(), new Promise((res)=>setTimeout(()=>res({receive:'timeout'}),2500))]);
      state.permission = r.receive;
    } else if (typeof Notification !== 'undefined') {
      state.permission = Notification.permission;
    }
  } catch (e) { state.error = (e && e.message) || String(e); }
  return state;
}

// Envoie un push de test à soi-même (via le backend). Retourne le statut HTTP.
export async function sendTestPush(uid) {
  try {
    const r = await fetch(`${BACKEND_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-notify-secret': NOTIFY_SECRET },
      body: JSON.stringify({
        toExternalId: uid,
        title: 'Trengo 🔔',
        message: 'Test de notification — ça marche !',
        data: { type: 'test', url: '/notifications' },
      }),
    });
    const body = await r.text().catch(() => '');
    return { ok: r.ok, status: r.status, body: body.slice(0, 300) };
  } catch (e) {
    return { ok: false, status: 0, body: (e && e.message) || String(e) };
  }
}
