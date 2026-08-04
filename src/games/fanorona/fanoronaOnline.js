/**
 * fanoronaOnline.js
 * ---------------------------------------------------------
 * Online 2-player wiring for Fanorona, built on Firebase
 * Firestore. Use a SEPARATE Firebase project from the main
 * Tsengo app so this game's quota never eats into Tsengo's.
 *
 * Setup:
 *   1. Create the second Firebase project (console.firebase.google.com)
 *   2. Enable Firestore (production mode) and Authentication > Anonymous
 *   3. npm install firebase   (in the Tsengo project)
 *   4. Fill in FANORONA_FIREBASE_CONFIG below with that project's config
 *
 * Firestore layout:
 *   fanorona_rooms/{roomCode}
 *     board:       string[45]   ("W" | "B" | null), serialized as JSON string
 *     toMove:      "W" | "B"
 *     players:     { W: uid|null, B: uid|null }
 *     status:      "waiting" | "ongoing" | "finished"
 *     winner:      "W" | "B" | null
 *     log:         array of { mover, notation }
 *     updatedAt:   server timestamp
 */

import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// Firebase project: trengo-fanorona (separate from Tsengo's main project,
// so this game's quota never eats into Tsengo's)
const FANORONA_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDh_ztUSkbvnaCr9ySoA2IoJBe1F_BhJ-E",
  authDomain: "trengo-fanorona.firebaseapp.com",
  projectId: "trengo-fanorona",
  storageBucket: "trengo-fanorona.firebasestorage.app",
  messagingSenderId: "386383120849",
  appId: "1:386383120849:web:f8dbdd573d8ce493d338f0",
};

let app;
function getFanoronaApp() {
  if (!app) {
    app = getApps().find((a) => a.name === "fanorona")
      ?? initializeApp(FANORONA_FIREBASE_CONFIG, "fanorona");
  }
  return app;
}

export function getFanoronaDb() {
  return getFirestore(getFanoronaApp());
}

// Resolves once an anonymous uid is available.
export function ensureFanoronaAuth() {
  const auth = getAuth(getFanoronaApp());
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve(user.uid);
      }
    }, reject);
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(reject);
    }
  });
}

function randomRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * Creates a new room, seats the creator as White, returns the room code.
 */
export async function createFanoronaRoom(initialBoardArray) {
  const uid = await ensureFanoronaAuth();
  const db = getFanoronaDb();
  const code = randomRoomCode();
  await setDoc(doc(db, "fanorona_rooms", code), {
    board: JSON.stringify(initialBoardArray),
    toMove: "W",
    players: { W: uid, B: null },
    status: "waiting",
    winner: null,
    log: [],
    updatedAt: serverTimestamp(),
  });
  return { code, uid, color: "W" };
}

/**
 * Joins an existing room as Black. Fails if the room is full,
 * missing, or already finished.
 */
export async function joinFanoronaRoom(code) {
  const uid = await ensureFanoronaAuth();
  const db = getFanoronaDb();
  const ref = doc(db, "fanorona_rooms", code.toUpperCase());

  const color = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("room-not-found");
    const data = snap.data();
    if (data.players.B && data.players.B !== uid) {
      if (data.players.W === uid) return "W"; // rejoining as White
      throw new Error("room-full");
    }
    if (data.players.B === uid) return "B"; // rejoining as Black
    tx.update(ref, { "players.B": uid, status: "ongoing", updatedAt: serverTimestamp() });
    return "B";
  });

  return { code: code.toUpperCase(), uid, color };
}

/**
 * Subscribes to realtime updates for a room. Returns an unsubscribe fn.
 * callback receives the parsed room state with `board` as an array.
 */
export function subscribeFanoronaRoom(code, callback) {
  const db = getFanoronaDb();
  const ref = doc(db, "fanorona_rooms", code.toUpperCase());
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    callback({ ...data, board: JSON.parse(data.board) });
  });
}

/**
 * Writes a completed turn to the room. Call this AFTER validating
 * the move locally with the same engine used offline (getAllTurns /
 * applyStep from FanoronaPremium.jsx) — Firestore rules below give
 * this a second, server-side check.
 */
export async function submitFanoronaTurn(code, { boardAfter, nextToMove, winner, logEntry }) {
  const db = getFanoronaDb();
  const ref = doc(db, "fanorona_rooms", code.toUpperCase());
  await updateDoc(ref, {
    board: JSON.stringify(boardAfter),
    toMove: nextToMove,
    winner: winner ?? null,
    status: winner ? "finished" : "ongoing",
    log: logEntry ? [logEntry] : [],
    updatedAt: serverTimestamp(),
  });
}

/**
 * Suggested Firestore security rules (paste into the Fanorona
 * project's Firestore rules — NOT the main Tsengo project):
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /fanorona_rooms/{roomCode} {
 *       allow read: if request.auth != null;
 *       allow create: if request.auth != null
 *         && request.resource.data.players.W == request.auth.uid;
 *       allow update: if request.auth != null
 *         && (resource.data.players.W == request.auth.uid
 *             || resource.data.players.B == request.auth.uid);
 *     }
 *   }
 * }
 */
