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

/**
 * Manaisotra ny mari-piatoana any amin'ny FARAN'ny URL ("…com." , "(…com)" , "…com!").
 * Tazonina kosa ny fonosana mifandanja : ".../Foo_(bar)" dia tsy tapahina.
 */
export function trimUrlTail(raw) {
  let url = String(raw == null ? '' : raw);
  const bal = (open, close) =>
    (url.split(open).length - 1) - (url.split(close).length - 1);
  for (let guard = 0; guard < 200 && url.length; guard++) {
    const last = url[url.length - 1];
    if ('.,;:!?\u2026\u00AB\u00BB"\'\u201C\u201D'.indexOf(last) !== -1) { url = url.slice(0, -1); continue; }
    if (last === ')' && bal('(', ')') < 0) { url = url.slice(0, -1); continue; }
    if (last === ']' && bal('[', ']') < 0) { url = url.slice(0, -1); continue; }
    if (last === '}' && bal('{', '}') < 0) { url = url.slice(0, -1); continue; }
    break;
  }
  return url;
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
    const url = trimUrlTail(raw);
    if (url) parts.push({ type: 'link', value: url, internal: parseAppLink(url) });
    const tail = raw.slice(url.length);
    if (tail) parts.push({ type: 'text', value: tail });
    last = m.index + raw.length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts.length ? parts : [{ type: 'text', value: text }];
}
