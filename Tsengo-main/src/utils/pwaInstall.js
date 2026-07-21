// src/utils/pwaInstall.js
// Capture l'événement d'installation PWA (beforeinstallprompt) dès le chargement,
// pour pouvoir déclencher l'installation depuis un bouton (page Admin).
let deferredPrompt = null;
let listeners = [];

function emit(available) {
  listeners.forEach((fn) => { try { fn(available); } catch (e) {} });
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();      // empêche la mini-infobar Chrome
    deferredPrompt = e;      // on garde l'event pour plus tard
    emit(true);
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit(false);
  });
}

// L'app tourne-t-elle déjà en mode installé (standalone) ?
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export function canInstall() { return !!deferredPrompt; }

// S'abonne aux changements de disponibilité. Retourne une fonction de désabonnement.
export function onInstallChange(cb) {
  listeners.push(cb);
  return () => { listeners = listeners.filter((f) => f !== cb); };
}

// Déclenche la vraie invite d'installation native.
export async function promptInstall() {
  if (!deferredPrompt) return { outcome: 'unavailable' };
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  if (choice && choice.outcome === 'accepted') deferredPrompt = null;
  return choice || { outcome: 'dismissed' };
}
