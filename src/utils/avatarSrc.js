// src/utils/avatarSrc.js
// Placeholder avatar ho an'ny <img> — icône olona manga malefaka, fond fotsy.
// Mitovy endrika amin'ny `PhotoPlaceholder`, fa data-URI ka azo atao `src`.

const BLUE = '%237CB8FF';   // #7CB8FF — voafono ho URI

const SVG =
  "data:image/svg+xml;charset=utf-8," +
  "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E" +
  "%3Crect width='64' height='64' fill='%23ffffff'/%3E" +
  "%3Cg fill='" + BLUE + "'%3E" +
  "%3Ccircle cx='32' cy='24' r='10'/%3E" +
  "%3Cpath d='M14 52c0-11 8-17 18-17s18 6 18 17c0 2-1.6 3.4-3.6 3.4H17.6C15.6 55.4 14 54 14 52z'/%3E" +
  "%3C/g%3E%3C/svg%3E";

/** Ny lien Cloudinary dia VAKY (kaonty nofoanana) — raisina ho tsy misy. */
export function avatarSrc(url) {
  if (!url || typeof url !== 'string') return SVG;
  if (url.includes('res.cloudinary.com')) return SVG;
  return url;
}

export default avatarSrc;
