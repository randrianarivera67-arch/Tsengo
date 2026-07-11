// src/utils/identity.js — Page Sera supprimée, toujours type:'user'
const KEY = 'trengo_identity_v1';

export function getIdentity() {
  return { type: 'user' };
}

export function setIdentity() {
  try { localStorage.removeItem(KEY); } catch {}
}

export function subscribeIdentity(cb) {
  return () => {};
}
