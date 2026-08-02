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
/**
 * Token entité :  @[Anarana Feno](uid)
 * Ny anarana no ASEHO, ny uid no MITONDRA — mitovy amin'ny Facebook.
 * Ny anarana dia mety misy elanelana sy marika ; ny `[^\\]]` no fetra.
 */
const ENTITY_RE = /@\[([^\]\n]{1,80})\]\(([A-Za-z0-9_-]{1,64})\)/g;

/**
 * Hashtag :  litera, isa, '_' — 2 ka hatramin'ny 50.
 * Ny `(^|[^...])` dia manakana ny `#` ao anaty teny (`abc#def`) sy ny `##`.
 * ⚠️ Ny `#` ao anaty URL dia tsy voakasika : ny splitLinks no mandeha ALOHA.
 */
const HASHTAG_RE = /(^|[^\p{L}\p{N}_#])#([\p{L}\p{N}_]{2,50})/gu;

/** Misy litera farafahakeliny ? (ny `#2026` dia daty, tsy marika) */
function validTag(t) { return /\p{L}/u.test(t); }

/**
 * Ny marika REHETRA ao anaty lahatsoratra, amin'ny sora-baventy KELY.
 * Ampiasaina amin'ny fitehirizana sy ny fikarohana.
 * @returns {string[]}  tsy misy doublon, fetra 10
 */
export function extractHashtags(text, max = 10) {
  const out = [];
  if (!text) return out;
  const seen = new Set();
  let m; HASHTAG_RE.lastIndex = 0;
  while ((m = HASHTAG_RE.exec(text)) !== null) {
    const t = m[2].toLowerCase();
    if (!validTag(t) || seen.has(t)) continue;
    seen.add(t); out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

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
    // ── ① Token entité @[Anarana](uid) — mandeha ALOHA ────────────────
    const chunks = [];
    let last = 0, m;
    ENTITY_RE.lastIndex = 0;
    while ((m = ENTITY_RE.exec(p.value)) !== null) {
      if (m.index > last) chunks.push({ text: p.value.slice(last, m.index) });
      chunks.push({ entity: { type: 'mention', value: '@' + m[1], name: m[1], uid: m[2] } });
      last = m.index + m[0].length;
    }
    if (last < p.value.length) chunks.push({ text: p.value.slice(last) });

    // ── ② @username tsotra ao anatin'ny ampahany sisa ─────────────────
    for (const c of chunks) {
      if (c.entity) { out.push(c.entity); continue; }
      let l2 = 0, m2;
      MENTION_RE.lastIndex = 0;
      while ((m2 = MENTION_RE.exec(c.text)) !== null) {
        const at = m2.index + m2[1].length;           // toerana marin'ny '@'
        if (at > l2) out.push({ type: 'text', value: c.text.slice(l2, at) });
        out.push({ type: 'mention', value: '@' + m2[2], username: m2[2] });
        l2 = at + 1 + m2[2].length;
      }
      if (l2 < c.text.length) out.push({ type: 'text', value: c.text.slice(l2) });
    }
  }

  // ── ③ Hashtag ao anatin'ny ampahany TEXT sisa ────────────────────────
  const withTags = [];
  for (const p of out) {
    if (p.type !== 'text') { withTags.push(p); continue; }
    let l3 = 0, m3;
    HASHTAG_RE.lastIndex = 0;
    while ((m3 = HASHTAG_RE.exec(p.value)) !== null) {
      const at = m3.index + m3[1].length;            // toerana marin'ny '#'
      if (!validTag(m3[2])) continue;                // `#2026` → lahatsoratra
      if (at > l3) withTags.push({ type: 'text', value: p.value.slice(l3, at) });
      withTags.push({ type: 'hashtag', value: '#' + m3[2], tag: m3[2].toLowerCase() });
      l3 = at + 1 + m3[2].length;
    }
    if (l3 < p.value.length) withTags.push({ type: 'text', value: p.value.slice(l3) });
  }
  out.length = 0; out.push(...withTags);
  return out.length ? out : parts;
}

/**
 * Ny uid REHETRA voatonona ao anaty lahatsoratra (token entité ihany).
 * Ampiasain'ny notification : mazava, tsy misy fampifanarahana anarana.
 * @returns {{uid:string, name:string}[]}
 */
export function mentionedEntities(text) {
  const out = [];
  if (!text) return out;
  let m; ENTITY_RE.lastIndex = 0;
  while ((m = ENTITY_RE.exec(text)) !== null) out.push({ uid: m[2], name: m[1] });
  return out;
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
