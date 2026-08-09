/**
 * patch-avatar-cloudinary.cjs   —  Lien Cloudinary = tsy misy sary
 * ─────────────────────────────────────────────────────────────────────────────
 * FOTOTRA : ny migration dia nanadio ny `posts.authorPhoto`, FA TSY ny
 *   `users.photoURL`. Ka ny `profile.photoURL` dia mbola mitondra lien
 *   Cloudinary VAKY — truthy izy, ka ny `<img>` no aseho fa tsy ny placeholder.
 *
 * FANITSIANA (avy hatrany, tsy mila migration) :
 *   Ny lien misy `res.cloudinary.com` dia raisina ho TSY MISY SARY.
 *
 * ⚠️ Ny fanadiovana ny `users` dia asa MISARAKA (script migration).
 *   Ity dia mamaha ny fahitana avy hatrany ho an'ny mpampiasa rehetra.
 *
 * VOAKASIKA : pages/Profile.jsx
 *
 * Fampandehanana :  node patch-avatar-cloudinary.cjs --dry
 *                   node patch-avatar-cloudinary.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const F = path.join(process.cwd(), 'src/pages/Profile.jsx');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita'); process.exit(1); }
let s = fs.readFileSync(F, 'utf8');
const c = (x) => s.split(x).length - 1;
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };
if (s.includes('hasPhoto')) { console.log('⏭  efa voapatch'); process.exit(0); }

/* ── ① Helper ── */
const H_OLD = "import PhotoPlaceholder from '../components/PhotoPlaceholder';";
if (c(H_OLD) !== 1) fail('import PhotoPlaceholder tsy hita — alefaso aloha ny patch-placeholder.cjs');
s = s.replace(H_OLD, H_OLD + `

// Ny lien Cloudinary dia VAKY (kaonty nofoanana) — raisina ho tsy misy sary.
const hasPhoto = (u) => !!u && typeof u === 'string' && !u.includes('res.cloudinary.com');`);

/* ── ② Avatar ── */
const A_OLD = '{profile.photoURL\n              ? <img src={profile.photoURL||';
if (c(A_OLD) !== 1) fail('avatar tsy hita (' + c(A_OLD) + ')');
s = s.replace(A_OLD, '{hasPhoto(profile.photoURL)\n              ? <img src={profile.photoURL||');

/* ── ③ Couverture ── */
let n = 0;
s = s.replace(/\{!coverURL && <PhotoPlaceholder type="camera"/, (m) => { n++; return '{!hasPhoto(coverURL) && <PhotoPlaceholder type="camera"'; });
s = s.replace(/background: coverURL \? 'linear-gradient/, (m) => { n++; return "background: hasPhoto(coverURL) ? 'linear-gradient"; });
s = s.replace(/\{coverURL && <img src=\{coverURL\}/, (m) => { n++; return '{hasPhoto(coverURL) && <img src={coverURL}'; });
if (n !== 3) fail('couverture : nandrasana 3 fanoloana, nahitana ' + n);

/* ── Fanamarinana ── */
if (!s.includes('const hasPhoto =')) fail('helper very');
if (!s.includes('{hasPhoto(profile.photoURL)')) fail('avatar tsy voaova');
if (!s.includes('{!hasPhoto(coverURL) && <PhotoPlaceholder')) fail('placeholder couverture tsy voaova');
if (s.includes('{!coverURL && <PhotoPlaceholder')) fail('couverture taloha mbola ao');
if (!s.includes('type="person" size={100}')) fail('placeholder avatar very');
if (!s.includes('coverRef')) fail('fampiakarana couverture simba');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY ? '✅ DRY-RUN (tsy nisy nosoratana)' : '✅ Patch vita : lien Cloudinary = placeholder');
