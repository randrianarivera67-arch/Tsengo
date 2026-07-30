// src/utils/liteMode.js
// MODE LITE — fomba Facebook Lite : maty ny temps réel amin'ny FIJERENA.
//
// Mitahiry ao amin'ny localStorage, ary mampahafantatra avy hatrany ny
// composant rehetra (tsy mila mamerina manokatra ny app).
//
// Rafitra mitovy amin'ny `dataSaver.js` — mba hitovy ny fitondrantena.

const KEY = 'trengo_lite_mode';
const listeners = new Set();

/** Velona ve ny Mode Lite ? */
export function isLiteOn() {
  try { return localStorage.getItem(KEY) === '1'; }
  catch { return false; }
}

/** Mamelona / mamono ny Mode Lite. */
export function setLite(value) {
  try { localStorage.setItem(KEY, value ? '1' : '0'); } catch {}
  listeners.forEach(cb => { try { cb(!!value); } catch {} });
}

/** Manaraka ny fiovana. Mamerina fonction fanesorana. */
export function subscribeLite(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
