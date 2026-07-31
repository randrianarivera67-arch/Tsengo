/**
 * patch-avatar-1.cjs   —  Avatar : 50 kB → ~8 kB  (dingana 1 : Home + Messages)
 * ─────────────────────────────────────────────────────────────────────────────
 * VOAMARINA TAMIN'NY DONNÉES MARINA (31/07/2026) :
 *   .../upload/v1783.../xxx.jpg                    → 50 768 octets
 *   .../upload/w_96,q_auto,f_auto/v1783.../xxx.jpg →  6 418 octets   (HTTP 200)
 *   Ny kaonty Cloudinary dia mbola MANAMBOATRA variante vaovao (last-modified
 *   androany), na dia tsy mandray upload intsony aza.
 *
 * OLANA : ~25 avatar samy hafa isaky ny session × 50 kB = ~1,2 Mo, nefa aseho
 *   amin'ny 30–52 px. Very 6×.
 *   Ny fonction `optimizeImage()` ao amin'ny cloudinary.js dia efa nanao izany
 *   hatramin'izay… fa TSY NAMPIASAINA na aiza na aiza (code maty).
 *
 * FOMBA : helper `av(url, size)` — mampiditra `w_128,h_128,c_fill,q_auto,f_auto`
 *   ao anatin'ny URL Cloudinary IHANY. Ny URL hafa (Telegram, ui-avatars) dia
 *   AVERINA TSY MIOVA → tsy misy risque amin'ny avatar vaovao.
 *
 * SIZE 128 : ny avatar lehibe indrindra amin'ireto fichier ireto dia 52 px
 *   (voarefy). 128 = 2,5× → mazava amin'ny écran retina.
 *
 * ⚠️ FIAROVANA — toerana NESORINA (tsy avatar boribory) :
 *   • Home:1680  width:'100%', height:'100%'   (conteneur habe tsy fantatra)
 *   • Home:2646  width:'100%', height:'100%'   (logo boutique)
 *   • Home:2682  width:'100%', height:'100%'   (logo groupe)
 *   • Home:2734  width:'100%', height:110      (carte profil rectangulaire)
 *   Ny `c_fill` carré dia hanimba azy ireo. Voafantina amin'ny fanamarinana
 *   `height:110` / `height:'100%'` ao amin'ny 300 caractères manaraka.
 *
 * PARSER : ny expression dia misy template literal (`${...}`) mitohy, ka TSY
 *   azo atao regex. Parser brace-balanced no ampiasaina, ary voamarina ny isa.
 *
 * DINGANA 1 : Home (13 toerana → 11) + Messages (11 → 11) = 60 % amin'ny trafic.
 *   Ny 62 sisa dia amin'ny dingana manaraka, rehefa voamarina ity.
 *
 * Fampandehanana :  node patch-avatar-1.cjs --dry
 *                   node patch-avatar-1.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(ROOT, r);

function read(f) {
  if (!fs.existsSync(f)) throw new Error('FICHIER TSY HITA : ' + f);
  return fs.readFileSync(f, 'utf8');
}

const files = {};
const touched = [];
const load = (r) => (files[r] = files[r] || read(P(r)));
const save = (r, s) => { files[r] = s; if (!touched.includes(r)) touched.push(r); };

const KEYS = ['photoURL', 'authorPhoto', 'fromPhoto', 'visitorPhoto'];
/** Marika manondro sary TSY boribory → tsy kitihina. */
const SKIP = ["height:'100%'", 'height: 110', 'height:110'];

/**
 * Mamono ny `src={…}` misy avatar → `src={av(…, size)}`.
 * Brace-balanced : ny `${…}` ao anaty template literal dia voatazona tsara.
 */
function wrapAvatars(src, size) {
  let out = '', i = 0, wrapped = 0, skipped = 0, seen = 0;
  for (;;) {
    const j = src.indexOf('src={', i);
    if (j === -1) { out += src.slice(i); break; }

    let d = 0, k = j + 4;                 // mipetraka amin'ny '{'
    for (; k < src.length; k++) {
      if (src[k] === '{') d++;
      else if (src[k] === '}') { d--; if (d === 0) break; }
    }
    if (k >= src.length) throw new Error('Accolade tsy mifanaraka manomboka amin\'ny index ' + j);

    const expr = src.slice(j + 5, k);
    const isAvatar = KEYS.some(x => expr.includes(x));

    if (isAvatar) {
      seen++;
      const after = src.slice(k + 1, k + 301);
      const skip = SKIP.some(m => after.includes(m)) || expr.trimStart().startsWith('av(');
      if (skip) { out += src.slice(i, k + 1); skipped++; }
      else { out += src.slice(i, j) + 'src={av(' + expr + ', ' + size + ')}'; wrapped++; }
    } else {
      out += src.slice(i, k + 1);
    }
    i = k + 1;
  }
  return { out, wrapped, skipped, seen };
}

/* ═══════════════════════════════════════════════════════════════════════════
   1 — utils/avatar.js  (FICHIER VAOVAO)
   ═══════════════════════════════════════════════════════════════════════════ */
const AV_SRC = `// src/utils/avatar.js
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
`;

{
  const rel = 'src/utils/avatar.js';
  if (fs.existsSync(P(rel))) console.log('  ⏭  avatar.js : efa misy');
  else { files[rel] = AV_SRC; touched.push(rel); }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2 — Fampiharana : Home.jsx sy Messages.jsx
   ═══════════════════════════════════════════════════════════════════════════ */
const TARGETS = [
  { rel: 'src/pages/Home.jsx',     imp: "import { av } from '../utils/avatar';", wrapped: 9, skipped: 4 },
  { rel: 'src/pages/Messages.jsx', imp: "import { av } from '../utils/avatar';", wrapped: 11, skipped: 0 },
];

for (const t of TARGETS) {
  let s = load(t.rel);
  const name = t.rel.split('/').pop();

  if (s.includes("from '../utils/avatar'")) { console.log('  ⏭  ' + name + ' : efa voapatch'); continue; }

  const r = wrapAvatars(s, 128);
  console.log('  • ' + name.padEnd(14) + ' hita ' + r.seen + ' · voahitsy ' + r.wrapped + ' · nesorina ' + r.skipped);

  if (r.wrapped !== t.wrapped || r.skipped !== t.skipped) {
    throw new Error('ASSERTION FAIL [' + name + '] : nandrasana ' + t.wrapped + '/' + t.skipped +
      ' (voahitsy/nesorina), nahitana ' + r.wrapped + '/' + r.skipped +
      '\n→ Niova ny fichier hatramin\'ny fanadihadiana. AJANONA, ary jereo.');
  }

  s = r.out;

  // Import : ampidirina aorian'ny import farany
  const lines = s.split('\n');
  let last = -1;
  for (let i = 0; i < lines.length; i++) if (/^import .*;$/.test(lines[i])) last = i;
  if (last === -1) throw new Error('ASSERTION FAIL [' + name + '] : tsy hita ny bloc import');
  lines.splice(last + 1, 0, t.imp);
  s = lines.join('\n');

  if ((s.match(/from '\.\.\/utils\/avatar'/g) || []).length !== 1) {
    throw new Error('ASSERTION FAIL [' + name + '] : import doublon');
  }

  save(t.rel, s);
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
