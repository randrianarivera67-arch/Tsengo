// src/utils/dataSaver.js
// Toggle "Économiser les données" — mitahiry ao amin'ny localStorage,
// ary mampahafantatra ny composant rehetra mampiasa azy (Home, Reels, Profile, GroupPage)
// rehefa miova ny valiny (na dia tsy mamerina fanontàna ny page aza).

const KEY = 'trengo_data_saver';
const OLD_KEY = 'tsengo_data_saver';
const listeners = new Set();

export function isDataSaverOn() {
  try {
    return (localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY)) === '1';
  } catch {
    return false;
  }
}

export function setDataSaver(value) {
  try {
    localStorage.setItem(KEY, value ? '1' : '0');
  } catch {}
  listeners.forEach(cb => cb(!!value));
}
// Alias — ampiasan'ny AppearanceSettings.jsx patch
export const setDataSaverOn = setDataSaver;

// Ampiasan'ny page rehetra (Home, Reels, Profile, GroupPage) mba ho voamarina
// ny state raha ovana ao amin'ny Paramètres na amin'ny tab hafa.
export function subscribeDataSaver(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
