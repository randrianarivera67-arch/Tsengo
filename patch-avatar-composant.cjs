/**
 * patch-avatar-composant.cjs   —  Composant Avatar : placeholder neon
 * ─────────────────────────────────────────────────────────────────────────────
 * FOTOTRA : ny en-tête publication ao amin'ny fil dia mampiasa ny COMPOSANT
 *   `<Avatar>`, tsy `<img src=…>` — ka tsy tratran'ny fanoloana teo aloha.
 *
 *   Avatar.jsx and.15 :
 *     const photo = src || `https://ui-avatars.com/api/?name=…`;
 *
 * FANOVANA : `avatarSrc(src)` — mamerina ny data-URI SVG raha foana na
 *   Cloudinary. Andalana IRAY, ary mamaha ny toerana rehetra mampiasa Avatar.
 *
 * VOAKASIKA : components/Avatar.jsx
 *
 * Fampandehanana :  node patch-avatar-composant.cjs --dry
 *                   node patch-avatar-composant.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const F = path.join(process.cwd(), 'src/components/Avatar.jsx');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/components/Avatar.jsx'); process.exit(1); }
if (!fs.existsSync(path.join(process.cwd(), 'src/utils/avatarSrc.js'))) {
  console.error('❌ avatarSrc.js tsy misy — alefaso aloha ny patch-avatar-partout.cjs'); process.exit(1);
}

let s = fs.readFileSync(F, 'utf8');
const c = (x) => s.split(x).length - 1;
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };
if (s.includes('avatarSrc(')) { console.log('⏭  efa voapatch'); process.exit(0); }

/* ── ① Import ── */
const lines = s.split('\n');
let last = -1;
for (let i = 0; i < lines.length; i++) if (/^import .* from '/.test(lines[i])) last = i;
if (last < 0) fail('tsy misy import ao amin\'ny Avatar.jsx');
lines.splice(last + 1, 0, "import { avatarSrc } from '../utils/avatarSrc';");
s = lines.join('\n');

/* ── ② Fanoloana ── */
const OLD = "const photo = src || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1877F2&color=fff`;";
if (c(OLD) !== 1) fail('andalana photo tsy hita (' + c(OLD) + ')');
s = s.replace(OLD,
  "// Placeholder neon (icône olona manga malefaka) raha foana na Cloudinary\n  const photo = avatarSrc(src);");

/* ── Fanamarinana ── */
if (!s.includes("import { avatarSrc }")) fail('import very');
if (!s.includes('const photo = avatarSrc(src);')) fail('fanoloana tsy tafiditra');
if (s.includes('ui-avatars.com')) fail('ui-avatars mbola ao');
if (!s.includes('showStory')) fail('story simba');
if (!s.includes('showOnline')) fail('statut en ligne simba');
if (!s.includes('<img src={photo}')) fail('img simba');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY ? '✅ DRY-RUN (tsy nisy nosoratana)' : '✅ Patch vita : composant Avatar');
