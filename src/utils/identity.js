// src/utils/identity.js — Page Sera supprimée
const KEY = 'trengo_identity_v1';
// Nettoyer localStorage au cas où un user avait type:'page' sauvegardé
try { localStorage.removeItem(KEY); } catch {}

export function getIdentity() { return { type: 'user' }; }
export function setIdentity() { try { localStorage.removeItem(KEY); } catch {} }
export function subscribeIdentity(cb) { return () => {}; }
