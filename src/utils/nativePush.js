// src/utils/nativePush.js
// Push notifications NATIVES (APK) via @capacitor/push-notifications + FCM.
// Le token natif est enregistré dans users/{uid}.fcmTokens — LE MÊME champ que
// le push web. Donc le backend Render (/notify → firebase-admin → FCM) délivre
// aussi bien au PWA qu'à l'APK, sans rien changer côté serveur.
// Sur le web / PWA, ce module ne fait rien (garde isNativePlatform).
import { Capacitor } from '@capacitor/core';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

let currentUid = null;
let currentToken = null;
let listenersAdded = false;

async function getPlugin() {
  const mod = await import('@capacitor/push-notifications');
  return mod.PushNotifications;
}

// Route à ouvrir au tap, selon le type de notification
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
  if (!Capacitor.isNativePlatform() || !uid) return; // web/PWA → géré par FCM web
  currentUid = uid;
  try {
    const PushNotifications = await getPlugin();

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') return;

    if (!listenersAdded) {
      listenersAdded = true;

      // Token FCM natif → users/{uid}.fcmTokens (lu par le backend)
      PushNotifications.addListener('registration', (token) => {
        currentToken = token.value;
        if (currentUid) {
          updateDoc(doc(db, 'users', currentUid), { fcmTokens: arrayUnion(token.value) }).catch(() => {});
        }
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.warn('Push registration error:', err?.error || err);
      });

      // App au premier plan : la cloche in-app se met à jour via Firestore (rien à afficher ici)
      PushNotifications.addListener('pushNotificationReceived', () => { /* no-op */ });

      // Tap sur la notification (app en arrière-plan/fermée) → ouvre la bonne page
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        try {
          const data = (action && action.notification && action.notification.data) || {};
          window.location.href = routeFor(data);
        } catch (e) { /* ignore */ }
      });
    }

    await PushNotifications.register();
  } catch (e) {
    console.warn('initNativePush failed:', (e && e.message) || e);
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
