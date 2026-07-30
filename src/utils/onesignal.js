// src/utils/onesignal.js — ⚠️ Migré vers FCM (Firebase Cloud Messaging)
// Ny anaran'ny fichier sy ny exports dia notazonina mba tsy hanova ny call sites rehetra.
// Push : Trengo → Render (/notify, firebase-admin) → FCM (Google) → Téléphone
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import app, { db, auth } from '../firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://tsengo-backend.onrender.com';
/**
 * En-tête fanamarinana ho an'ny backend.
 * ID token Firebase — voamarina amin'i Google, tsy azo foronina.
 * TSY MISY SECRET AO ANATY BUNDLE INTSONY.
 */
async function authHeader() {
  const u = auth.currentUser;
  if (!u) return null;                       // tsy tafiditra → tsy mandefa
  try {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${await u.getIdToken()}` };
  } catch (e) { return null; }
}
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

let currentUid = null;
let currentToken = null;
let initInFlight = null;

async function initFCM(uid) {
  if (!uid) return;
  currentUid = uid;
  if (initInFlight) return initInFlight;
  initInFlight = (async () => {
    try {
      if (!(await isSupported())) { console.warn('FCM non supporté sur ce navigateur'); return; }
      if (!VAPID_KEY) { console.warn('VITE_FIREBASE_VAPID_KEY manquant — push désactivé'); return; }

      // Permission
      if (Notification.permission === 'denied') return;
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;
      }

      // Service worker (efa ao amin'ny /public)
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;

      const messaging = getMessaging(app);
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
      if (!token) return;
      currentToken = token;

      // Tehirizina ao amin'ny Firestore : users/{uid}.fcmTokens
      await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) }).catch(() => {});
      console.log('✅ FCM prêt');

      // Premier plan : aseho ho notification système ihany (feo/vibration = an'ny système)
      onMessage(messaging, payload => {
        try {
          const d = payload.data || {};
          const actions = d.canReply === '1'
            ? [{ action: 'reply', type: 'text', title: 'Répondre', placeholder: 'Votre message...', icon: '/notif-reply.png' }, { action: 'close', title: 'Fermer', icon: '/notif-close.png' }]
            : [{ action: 'open', title: 'Voir', icon: '/notif-open.png' }, { action: 'close', title: 'Fermer', icon: '/notif-close.png' }];
          reg.showNotification(d.title || 'Trengo', {
            body: d.body || '',
            icon: d.icon || '/icon-192.png',
            badge: '/icon-96.png',
            vibrate: [250, 120, 250],
            tag: d.type === 'message' ? 'msg_' + (d.conversationId || '') : undefined,
            actions,
            data: { ...d, link: d.url || '/' },
          });
        } catch (e) { console.warn('onMessage display:', e); }
      });
    } catch (e) {
      console.warn('FCM init failed:', e?.message || e);
    } finally {
      initInFlight = null;
    }
  })();
  return initInFlight;
}

// ── Exports mitovy anarana amin'ny taloha (tsy manova ny call sites) ──

export function setOneSignalExternalId(uid) {
  initFCM(uid);
}

export function removeOneSignalExternalId() {
  // Esorina ny token an'ity appareil ity amin'ny compte (déconnexion)
  if (currentUid && currentToken) {
    updateDoc(doc(db, 'users', currentUid), { fcmTokens: arrayRemove(currentToken) }).catch(() => {});
  }
  currentUid = null; currentToken = null;
}

export function requestNotificationPermission() {
  if (currentUid) initFCM(currentUid);
}

export function subscribeToFCMTopic() { /* tsy ampiasaina */ }

/**
 * Diffusion ADMIN → mpampiasa REHETRA (push + notification anaty app).
 *
 * Ny fanamarinana dia atao AO AMIN'NY BACKEND amin'ny ID token Firebase.
 * Raha tsy admin ilay mpiantso dia mamaly 403 ny serveur.
 *
 * Tsy manakana : raha tsy mety dia tsy manelingelina ny publication.
 */
export async function notifyAllUsers({ title, message, postId, fromName, fromPhoto }) {
  const u = auth.currentUser;
  if (!u || !title || !message) return { skipped: true };

  const send = async () => {
    const idToken = await u.getIdToken();
    const r = await fetch(`${BACKEND_URL}/notify-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        title,
        message,
        postId: postId || '',
        fromName: fromName || '',
        fromPhoto: fromPhoto || '',
      }),
      keepalive: true,
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  };

  try {
    return await send();
  } catch (err) {
    // Retry tokana (ohatra : Render mifoha avy amin'ny torimaso)
    try {
      await new Promise(res => setTimeout(res, 2500));
      return await send();
    } catch (e2) {
      console.warn('Diffusion admin échouée :', e2?.message || e2);
      return { error: true };
    }
  }
}

export async function sendPushNotification({ toExternalId, title, message, data, fromPhoto }) {
  if (!toExternalId) return;
  const send = async () => fetch(`${BACKEND_URL}/notify`, {
    method: 'POST',
    headers: (await authHeader()) || { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toExternalId, title, message, data, fromPhoto }),
    keepalive: true,   // mamita ny requête na dia mikatona aza ny page
  });
  try {
    const r = await send();
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  } catch (err) {
    // Retry tokana (ohatra : Render mifoha avy amin'ny torimaso)
    try { await new Promise(r => setTimeout(r, 2500)); await send(); }
    catch (e2) { console.warn('Push notification failed:', e2?.message || e2); }
  }
}
