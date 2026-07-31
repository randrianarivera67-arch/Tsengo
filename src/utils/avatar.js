// src/utils/avatar.js
// Avatar : mampihena ny sary Cloudinary amin'ny habe TENA ASEHO.
//
// Voamarina tamin'ny donnée marina (31/07/2026) :
//   sary feno            → 50 768 octets
//   w_96,q_auto,f_auto   →  6 418 octets   (fihenana 7,9×)
//
// Ny variante dia amboarin'i Cloudinary amin'ny fangatahana VOALOHANY dia
// tehirizina — ka miasa amin'ny avatar EFA MISY rehetra, tsy misy migration.

const CLD = 'res.cloudinary.com';
const MARK = '/image/upload/';

/**
 * @param {string} url   URL avatar (Cloudinary, Telegram, ui-avatars, sns.)
 * @param {number} size  Habe amin'ny pixel (carré). Default 128.
 * @returns {string}     URL voahitsy, na ny URL TANY AM-BOALOHANY raha tsy
 *                       Cloudinary — tsy manimba na oviana na oviana.
 */
export function av(url, size = 128) {
  if (!url || typeof url !== 'string') return url;
  if (url.indexOf(CLD) === -1) return url;          // Telegram / ui-avatars / hafa

  const i = url.indexOf(MARK);
  if (i === -1) return url;

  const head = url.slice(0, i + MARK.length);
  const tail = url.slice(i + MARK.length);
  if (!tail) return url;
  // Efa misy transformation (w_, c_, q_, f_, e_…) → tsy asiana faharoa.
  // Ny segment version ('v1783507023') dia tsy mifanaraka amin'ity : tsy misy '_'.
  if (/^[a-z]{1,3}_/.test(tail)) return url;

  const n = Math.max(16, Math.min(1024, Math.round(Number(size) || 128)));
  return head + 'w_' + n + ',h_' + n + ',c_fill,q_auto,f_auto/' + tail;
}
