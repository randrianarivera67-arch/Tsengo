// src/utils/liteMode.js
// MODE LITE — fomba Facebook Lite : maty ny temps réel amin'ny FIJERENA.
//
// Mitahiry ao amin'ny localStorage, ary mampahafantatra avy hatrany ny
// composant rehetra (tsy mila mamerina manokatra ny app).
//
// Rafitra mitovy amin'ny `dataSaver.js` — mba hitovy ny fitondrantena.

const KEY = 'trengo_lite_mode';
const listeners = new Set();

/**
 * Velona ve ny Mode Lite ?
 *
 * ⚠️ VELONA NY DEFAULT (`!== '0'`) : ny mpampiasa tsy mbola nisafidy dia
 * mahazo ny Lite avy hatrany — io no safidy tsara indrindra ho an'ny
 * forfait Malagasy. Ny efa nanao safidy dia manana '0' na '1' voatahiry,
 * ka tsy voakasika mihitsy.
 */
export function isLiteOn() {
  try { return localStorage.getItem(KEY) !== '0'; }
  catch { return true; }
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
