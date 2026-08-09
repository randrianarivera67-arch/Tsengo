/**
 * patch-avatar-partout.cjs   —  Placeholder manerana ny app (HOME aloha)
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA : 78 antso `ui-avatars.com` ao amin'ny fichier 23. Ny endrika dia
 *   MITOVY foana :   src={X || `https://ui-avatars.com/api/?name=…`}
 *
 * FOMBA : helper `avatarSrc(url, name)` — mamerina :
 *   • ny `url` raha mety (tsy Cloudinary, tsy foana)
 *   • raha tsy izany : data-URI SVG — icône olona MANGA MALEFAKA, fond FOTSY
 *     (mitovy amin'ny PhotoPlaceholder, fa azo ampiasaina amin'ny <img>)
 *
 *   Fanoloana chaîne fotsiny — tsy misy composant vaovao, tsy misy fanovana
 *   rafitra. Azo amarinina isaky ny fichier.
 *
 * ITY DINGANA : Home.jsx ihany (11 antso avatar).
 *   Ny sisa (GroupPage, Messages, Friends…) dia dingana manaraka.
 *
 * Fampandehanana :  node patch-avatar-partout.cjs --dry
 *                   node patch-avatar-partout.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(process.cwd(), r);
const read = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
const files = {}; const touched = [];
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

/* ═══ ① Helper ════════════════════════════════════════════════════════ */
const HELPER = `// src/utils/avatarSrc.js
// Placeholder avatar ho an'ny <img> — icône olona manga malefaka, fond fotsy.
// Mitovy endrika amin'ny \`PhotoPlaceholder\`, fa data-URI ka azo atao \`src\`.

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
`;
{
  const rel = 'src/utils/avatarSrc.js';
  if (fs.existsSync(P(rel))) console.log('  ⏭  avatarSrc.js : efa misy');
  else { files[rel] = HELPER; touched.push(rel); console.log('  • avatarSrc.js'); }
}

/* ═══ ② Fichier rehetra ═══════════════════════════════════════════════ */
const CIBLES = [
  'src/pages/Home.jsx', 'src/pages/Profile.jsx', 'src/pages/GroupPage.jsx',
  'src/pages/PostDetail.jsx', 'src/pages/Messages.jsx', 'src/pages/Friends.jsx',
  'src/pages/Notifications.jsx', 'src/pages/Search.jsx', 'src/pages/Reels.jsx',
  'src/pages/HashtagPage.jsx', 'src/pages/Groups.jsx',
];
let TOTAL = 0;
for (const rel of CIBLES) {
  let s = read(P(rel));
  const name = rel.split('/').pop();
  if (s === null) { console.log('  ⏭  ' + name + ' : tsy misy'); continue; }
  if (s.includes('avatarSrc(')) { console.log('  ⏭  ' + name + ' : efa voapatch'); continue; }
  if (!s.includes('ui-avatars.com')) { console.log('  ⏭  ' + name + ' : tsy misy avatar'); continue; }
  {
    const m = s.match(/^import .* from '\.\.\/(utils|components|hooks)\/[^']*';$/m);
    if (!m) fail(name + ' : toerana import tsy hita');
    s = s.replace(m[0], m[0] + "\nimport { avatarSrc } from '../utils/avatarSrc';");

    // src={X || `https://ui-avatars.com/…`}  →  src={avatarSrc(X)}
    const RE = /src=\{([^}|]+?)\s*\|\|\s*`https:\/\/ui-avatars\.com\/api\/\?name=\$\{[^`]*`\}/g;
    const before = (s.match(RE) || []).length;
    if (before === 0) { console.log('  ⏭  ' + name + ' : endrika hafa (' + (s.match(/ui-avatars\.com/g)||[]).length + ' antso)'); continue; }
    s = s.replace(RE, (mm, expr) => 'src={avatarSrc(' + expr.trim() + ')}');
    const after = (s.match(/ui-avatars\.com/g) || []).length;
    console.log('  • ' + name + ' : ' + before + ' voaova · ' + after + ' tavela');
    TOTAL += before;
    files[rel] = s; touched.push(rel);
  }
}
if (TOTAL === 0) fail('tsy nisy fanoloana mihitsy');

/* ═══ Fanamarinana ════════════════════════════════════════════════════ */
{
  for (const rel of touched) {
    if (rel.endsWith('avatarSrc.js')) continue;
    const t = files[rel]; const n = rel.split('/').pop();
    if (!t.includes("import { avatarSrc }")) fail(n + ' : import very');
    if (/src=\{avatarSrc\([^)]*\)\}\}/.test(t)) fail(n + ' : accolade mihoatra');
    if (/avatarSrc\([^)]*\|\|/.test(t)) fail(n + ' : fanoloana tsy feno');
  }
  const h = files['src/pages/Home.jsx'] || read(P('src/pages/Home.jsx'));
  if (!h.includes('FARITRA MANIDINA')) fail('Home : faritra manidina simba');
  if (!h.includes('quickLike')) fail('Home : réaction simba');

  const a = files['src/utils/avatarSrc.js'] || read(P('src/utils/avatarSrc.js'));
  if (!a.includes("res.cloudinary.com")) fail('fitsipika Cloudinary very');
  if (!a.includes("%237CB8FF")) fail('loko manga malefaka very');
  if (!a.includes("fill='%23ffffff'")) fail('fond fotsy very');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
