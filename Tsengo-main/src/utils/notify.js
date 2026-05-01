// src/utils/notify.js
// Mamoaka notification ao Firestore SY alefa OneSignal push notification

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { sendPushNotification } from './onesignal';

/**
 * Mamoaka notification:
 * 1. Tehirizo ao Firestore (haseho ao amin'ny Notifications page)
 * 2. Alefa OneSignal push (milatra ny telefona na mikantona)
 */
export async function sendNotification({
  toUid,
  fromUid,
  fromName,
  fromPhoto = '',
  type,         // 'comment' | 'reaction' | 'friendRequest' | 'friendAccepted' | 'message'
  postId = null,
  message,
}) {
  // Emoji ho an'ny karazana notification
  const icons = {
    comment: '💬',
    reaction: '❤️',
    friendRequest: '👥',
    friendAccepted: '✅',
    message: '📩',
  };

  const title = `Tsengo ${icons[type] || '🔔'}`;

  try {
    // 1. Tehirizo ao Firestore
    await addDoc(collection(db, 'notifications'), {
      toUid,
      fromUid,
      fromName,
      fromPhoto,
      type,
      postId,
      message,
      read: false,
      createdAt: serverTimestamp(),
    });

    // 2. Alefa OneSignal push — mivantana any amin'ny telefona
    await sendPushNotification({
      toExternalId: toUid,   // Firebase UID = OneSignal external_id
      title,
      message,
      data: { type, postId, fromUid },
    });
  } catch (err) {
    console.error('sendNotification error:', err);
  }
}
