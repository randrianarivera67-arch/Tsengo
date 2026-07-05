// src/utils/uploadManager.js
// Gestionnaire d'envoi en ARRIÈRE-PLAN : ny upload dia mitohy na dia
// mifindra page hafa ao anaty Traingo aza ianao (module singleton,
// tsy miankina amin'ny composant React). Misy indicateur global ao amin'ny Layout.
import { uploadToTelegram } from './telegram';
import { compressVideo } from './videoCompress';

const COMPRESS_THRESHOLD = 25 * 1024 * 1024; // vidéo > 25 Mo → compressée aloha

let current = null; // { label, pct, status: 'uploading'|'saving'|'done'|'error', error? }
const listeners = new Set();

function emit() { for (const cb of listeners) { try { cb(current); } catch {} } }

export function subscribeUpload(cb) {
  listeners.add(cb);
  try { cb(current); } catch {}
  return () => listeners.delete(cb);
}

export function isUploading() {
  return !!current && (current.status === 'uploading' || current.status === 'saving' || current.status === 'compressing');
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
      // 🎞️ Compression aloha raha vidéo lehibe (720p ~2,5 Mbps → lecture fluide)
      if (file.type?.startsWith('video/') && file.size > COMPRESS_THRESHOLD) {
        current = { ...current, status: 'compressing', pct: 0 };
        emit();
        const compressed = await compressVideo(file, pct => {
          if (current) { current = { ...current, pct }; emit(); }
        });
        if (compressed && compressed.size > 0 && compressed.size < file.size) {
          console.log(`Compression : ${Math.round(file.size/1048576)} Mo → ${Math.round(compressed.size/1048576)} Mo`);
          file = compressed;
        }
        current = { ...current, status: 'uploading', pct: 0 };
        emit();
      }

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
