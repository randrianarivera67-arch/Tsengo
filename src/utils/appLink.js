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

/**
 * Username : litera, isa, '_' sy '.', 2–30. Mifanaraka amin'ny Register.
 * ⚠️ Ny `(^|[^\\p{L}\\p{N}_])` dia MANAKANA ny mailaka : ao amin'ny
 * `rakoto@tony.mg` dia misy litera mialoha ny '@' → tsy mention.
 */
const MENTION_RE = /(^|[^\p{L}\p{N}_@])@([a-zA-Z0-9_.]{2,30})/gu;

/**
 * Mizara ny lahatsoratra ho ampahany, miaraka amin'ny mention.
 * @returns {{type:'text'|'link'|'mention', value:string, internal?:string, username?:string}[]}
 */
export function splitRich(text) {
  const parts = splitLinks(text);
  const out = [];
  for (const p of parts) {
    if (p.type !== 'text') { out.push(p); continue; }
    let last = 0, m;
    MENTION_RE.lastIndex = 0;
    while ((m = MENTION_RE.exec(p.value)) !== null) {
      const at = m.index + m[1].length;              // toerana marin'ny '@'
      if (at > last) out.push({ type: 'text', value: p.value.slice(last, at) });
      out.push({ type: 'mention', value: '@' + m[2], username: m[2] });
      last = at + 1 + m[2].length;
    }
    if (last < p.value.length) out.push({ type: 'text', value: p.value.slice(last) });
  }
  return out.length ? out : parts;
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
