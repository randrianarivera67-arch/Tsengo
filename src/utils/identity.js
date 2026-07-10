// src/utils/identity.js — "Changer de profil" (compte personnel ↔ page Sera)
// Toy ny switch Facebook : rehefa page no voafidy dia amin'ny anaran'ilay page
// no amoahana ny publications (fa ny compte no mitantana azy ao ambadika).

const KEY = 'trengo_identity_v1';

/** { type:'user' } na { type:'page', id, name, photoURL } */
export function getIdentity() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (v && v.type === 'page' && v.id) return v;
  } catch {}
  return { type: 'user' };
}

export function setIdentity(identity) {
  try {
    if (!identity || identity.type === 'user') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(identity));
  } catch {}
  try { window.dispatchEvent(new Event('trengo-identity-changed')); } catch {}
}

export function subscribeIdentity(cb) {
  const fn = () => cb(getIdentity());
  window.addEventListener('trengo-identity-changed', fn);
  window.addEventListener('storage', fn);
  return () => { window.removeEventListener('trengo-identity-changed', fn); window.removeEventListener('storage', fn); };
}
