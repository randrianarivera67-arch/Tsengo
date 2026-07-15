// src/utils/download.js
// Telechargement REEL, SANS backend.
//  - APK natif : plugin TrengoDownloader -> DownloadManager Android
//    => le fichier arrive dans /Download + notification systeme, aucun CORS.
//  - Web/PWA : fetch -> blob -> <a download>. Si le CORS du bucket bloque,
//    fallback : ouverture dans un nouvel onglet (l'utilisateur enregistre).
import { Capacitor, registerPlugin } from '@capacitor/core';

const TrengoDownloader = registerPlugin('TrengoDownloader');

const EXT_BY_TYPE = { image: 'jpg', photo: 'jpg', video: 'mp4', audio: 'mp3', music: 'mp3' };
const MIME_BY_EXT = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', '3gp': 'video/3gpp',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg',
};

// Extension depuis l'URL (les URLs Firebase Storage gardent .jpg avant le ?)
function extFrom(url, mediaType) {
  try {
    const clean = decodeURIComponent(String(url).split('?')[0]);
    const m = clean.match(/\.([a-zA-Z0-9]{2,4})$/);
    if (m && MIME_BY_EXT[m[1].toLowerCase()]) return m[1].toLowerCase();
  } catch (e) { /* ignore */ }
  return EXT_BY_TYPE[String(mediaType || '').toLowerCase()] || 'jpg';
}

function safeName(name) {
  return String(name || 'trengo')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 60) || 'trengo';
}

function buildName(url, mediaType, filename) {
  const ext = extFrom(url, mediaType);
  const base = safeName((filename || `trengo_${mediaType || 'media'}_${Date.now()}`).replace(/\.[a-zA-Z0-9]{2,4}$/, ''));
  return `${base}.${ext}`;
}

async function webDownload(url, name) {
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    // Un blob HTML = page d'erreur -> ne pas enregistrer un "fichier code"
    if (blob.type && blob.type.indexOf('text/html') === 0) throw new Error('reponse HTML');
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 15000);
    return { ok: true, mode: 'blob' };
  } catch (e) {
    // CORS/erreur -> on ouvre le fichier (l'utilisateur fait "enregistrer")
    try { window.open(url, '_blank', 'noopener'); } catch (e2) { /* ignore */ }
    return { ok: false, mode: 'open', error: (e && e.message) || String(e) };
  }
}

/**
 * Telecharge un media.
 * @param {string} url        URL du fichier
 * @param {string} mediaType  'image' | 'video' | 'audio'
 * @param {string} [filename] nom souhaite (sans extension)
 */
export async function downloadMedia(url, mediaType = 'image', filename) {
  if (!url) return { ok: false, error: 'url manquante' };
  const name = buildName(url, mediaType, filename);
  const ext = name.split('.').pop();
  const mime = MIME_BY_EXT[ext] || 'application/octet-stream';

  if (Capacitor.isNativePlatform()) {
    try {
      await TrengoDownloader.download({ url, filename: name, mime });
      return { ok: true, mode: 'native', filename: name };
    } catch (e) {
      // Si le plugin manque (vieil APK), on retombe sur le web
      return await webDownload(url, name);
    }
  }
  return await webDownload(url, name);
}

export default downloadMedia;
