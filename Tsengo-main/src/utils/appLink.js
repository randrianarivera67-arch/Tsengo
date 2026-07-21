// src/utils/appLink.js
// Mamantatra ny "lien Trengo" (na URL feno na chemin) ary mamerina ny chemin interne.
// Ohatra : https://trengo-mg.vercel.app/artists/abc123  →  /artists/abc123

const ROUTES = 'artists|profile|post|pages|shop|groups|events|announcements';

/** Mamerina ny chemin interne (ex: "/artists/abc") na null. */
export function parseAppLink(text) {
  if (!text || typeof text !== 'string') return null;
  const t = text.trim();
  const re = new RegExp(`(?:https?://[^/\\s]+)?(/(?:${ROUTES})/[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)?)`, 'i');
  const m = t.match(re);
  return m ? m[1] : null;
}

/** Mizara ny lahatsoratra ho ampahany : { type: 'text'|'link', value, internal } */
export function splitLinks(text) {
  if (!text) return [];
  const urlRe = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = [];
  let last = 0, m;
  while ((m = urlRe.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
    const raw = m[0];
    parts.push({ type: 'link', value: raw, internal: parseAppLink(raw) });
    last = m.index + raw.length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts.length ? parts : [{ type: 'text', value: text }];
}
