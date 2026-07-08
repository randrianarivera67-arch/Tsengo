// src/utils/uploadManager.js
// Gestionnaire d'envoi en ARRIÈRE-PLAN : ny upload dia mitohy na dia
// mifindra page hafa ao anaty Trengo aza ianao (module singleton,
// tsy miankina amin'ny composant React). Misy indicateur global ao amin'ny Layout.
import { uploadToTelegram } from './telegram';

// ⚠️ FIX BUG (video "loading" mandrakizay / mijanona am-po) : ny compression
// tao aloha (MediaRecorder/canvas) dia mamorona fichier tsy misy "duration"
// marina ao anaty métadonnées matetika — io no nahatonga ny video "vita
// télécharger" fa tsy mety mihitsy milalao (loading atrany), ary mety
// nanova ny endriky ny video (portrait/paysage) satria fanoratana indray.
// Ny vahaolana azo antoka kokoa : ampiasaina TSY MIOVA (byte-exact) foana
// ilay fichier original, alefa amin'ny chunking — mitovy tanteraka amin'ilay
// napetraky ny mpampiasa (endrika, hauteur, durée marina foana).

let current = null; // { label, pct, status: 'uploading'|'saving'|'done'|'error', error? }
const listeners = new Set();

function emit() { for (const cb of listeners) { try { cb(current); } catch {} } }

export function subscribeUpload(cb) {
  listeners.add(cb);
  try { cb(current); } catch {}
  return () => listeners.delete(cb);
}

export function isUploading() {
  return !!current && (current.status === 'uploading' || current.status === 'saving');
}

/**
 * Manomboka upload arrière-plan.
 * @param {File} file
 * @param {string} label  ex: "Vidéo"
 * @param {(r:{url:string,type:string})=>Promise<void>} afterUpload  mamorona ny post/story rehefa vita
 * @returns {boolean} false raha misy upload efa mandeha
 */
export function startBackgroundUpload(file, label, afterUpload) {
  if (isUploading()) {
    alert('Un envoi est déjà en cours — attendez la fin avant d\'en lancer un autre.');
    return false;
  }
  current = { label, pct: 0, status: 'uploading' };
  emit();

  // Fampitandremana raha te-hanidy ny onglet raha mbola mandeha ny upload
  const beforeUnload = e => { e.preventDefault(); e.returnValue = ''; };
  window.addEventListener('beforeunload', beforeUnload);

  (async () => {
    try {
      const r = await uploadToTelegram(file, pct => {
        if (current) { current = { ...current, pct }; emit(); }
      });
      current = { ...current, pct: 100, status: 'saving' };
      emit();
      await afterUpload(r);
      current = { ...current, status: 'done' };
      emit();
      setTimeout(() => { current = null; emit(); }, 4000);
    } catch (err) {
      console.error('Background upload:', err);
      current = { ...(current || { label }), status: 'error', error: err?.message || String(err) };
      emit();
      setTimeout(() => { current = null; emit(); }, 10000);
    } finally {
      window.removeEventListener('beforeunload', beforeUnload);
    }
  })();

  return true;
}
