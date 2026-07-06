// src/utils/dataSaver.js
// "Économiser des données" — safidy tehirizina eo amin'ny appareil (localStorage).
// Rehefa ON : ny vidéo (Reels, Stories, fil/groupe/profil) tsy mandeha ho azy —
// mila tap voalohany ny mpampiasa, ary tsy misy préchargement (preload="none").
const KEY = 'traingo_data_saver';
const listeners = new Set();

export function isDataSaverOn() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function setDataSaver(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {}
  for (const cb of listeners) { try { cb(on); } catch {} }
}

export function subscribeDataSaver(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
