/**
 * patch-avatar-lite.cjs   —  Avatar : fomba Facebook Lite
 * ─────────────────────────────────────────────────────────────────────────────
 * FOTOTRA (fikarohana) : ny Facebook dia mamorona habe MAROMARO amin'ny
 *   FAMPIAKARANA, dia manolotra ny kely indrindra mifanaraka amin'ny toerana.
 *   Ny sary profil dia aseho amin'ny 160×160 ; 180×180 no habe atolotra
 *   hampiakarina. NY SERVEUR NO MANAPAKA NY HABE, TSY NY CLIENT.
 *
 * TOE-JAVATRA ANKEHITRINY : avatar tokana ~60 kB (720 px) ampiasaina na aiza
 *   na aiza, na dia aseho amin'ny 30–52 px aza ny ankamaroany.
 *
 * ⚠️ TSY AZO AHENA MIVANTANA ny `photoURL` : voamarina fa ampiasaina koa izy ho
 *   `mediaURL` an'ny publication sary profil (Profile.jsx:492), izay aseho
 *   amin'ny FULLSCREEN. Ny fampihenana azy dia hanimba ny galerie.
 *
 * VAHAOLANA — habe roa, toy ny Facebook :
 *   • `photoURL`   720 px (~60 kB) → publication sary profil, fullscreen
 *   • `photoThumb` 160 px (~10 kB) → avatar rehetra
 *
 * FIHETSIKA MAHAFINARITRA : ny saha denormalisé (`authorPhoto`, `fromPhoto`)
 *   dia mitahiry ny THUMB. Ka ny toerana FAMPISEHOANA 86 dia TSY VOAKASIKA
 *   MIHITSY — mahazo ny sary kely ho azy izy ireo.
 *   Tsy toy ny andrana teo aloha (Cloudinary) izay nikitika ny fampisehoana.
 *
 * VOAKASIKA :
 *   • Register.jsx, Profile.jsx — famoronana `photoThumb` amin'ny upload (2)
 *   • 43 toerana fanoratana denormalisé amin'ny fichier 10 —
 *     `userProfile.photoURL` → `(userProfile.photoThumb || userProfile.photoURL)`
 *
 * AZO ANTOKA :
 *   • Mpampiasa efa misy : tsy manana `photoThumb` → miverina amin'ny `photoURL`.
 *     Tsy misy avatar very, tsy misy migration.
 *   • Publication efa misy : mitazona ny `authorPhoto` taloha — tsy voakasika.
 *   • Raha tsy mety ny famoronana thumb → `photoThumb` tsy voatahiry, mandeha
 *     toy ny teo aloha. Tsy manakana ny fampiakarana MIHITSY.
 *
 * Fampandehanana :  node patch-avatar-lite.cjs --dry
 *                   node patch-avatar-lite.cjs
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
const countOf = (s, sub) => s.split(sub).length - 1;
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 240) + '\n-----------');
  }
  return src.replace(old, neo);
}

const files = {};
const touched = [];
const load = (r) => (files[r] = files[r] || read(P(r)));
const save = (r, s) => { files[r] = s; if (!touched.includes(r)) touched.push(r); };

/* ═══════════════════════════════════════════════════════════════════════════
   1 — Profile.jsx : famoronana `photoThumb` rehefa manova sary
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Profile.jsx';
  let s = load(rel);

  if (s.includes('photoThumb')) {
    console.log('  ⏭  Profile.jsx : efa voapatch');
  } else {
    // import makeThumb
    const m = s.match(/import \{ uploadToTelegram([^}]*)\} from '\.\.\/utils\/telegram';/);
    if (!m) throw new Error('ASSERTION FAIL [Profile:import] : tsy hita ny import telegram');
    if (countOf(s, m[0]) !== 1) throw new Error('ASSERTION FAIL [Profile:import] : tsy tokana');
    if (!/makeThumb/.test(m[0])) {
      s = s.replace(m[0], `import { uploadToTelegram${m[1].replace(/\s*$/, '')}, makeThumb } from '../utils/telegram';`);
    }

    s = rep(s,
      `      const r = await uploadToTelegram(file);
      await updateDoc(doc(db,'users',currentUser.uid), { photoURL: r.url });
      setProfile(p=>({...p,photoURL:r.url})); setUserProfile(p=>({...p,photoURL:r.url}));`,
      `      const r = await uploadToTelegram(file);
      // ── Avatar Lite : vignette 160 px (~10 kB) ho an'ny fampisehoana rehetra.
      // Ny \`photoURL\` 720 px dia tazonina ho an'ny publication sary profil
      // (aseho fullscreen). Tsy manakana : raha tsy mety dia '' no apetraka.
      let thumb = '';
      try {
        const th = await makeThumb(file, 160);
        if (th) { const tr = await uploadToTelegram(th); thumb = tr.url || ''; }
      } catch (e) { thumb = ''; }
      await updateDoc(doc(db,'users',currentUser.uid), { photoURL: r.url, photoThumb: thumb });
      setProfile(p=>({...p,photoURL:r.url,photoThumb:thumb})); setUserProfile(p=>({...p,photoURL:r.url,photoThumb:thumb}));`,
      'Profile:upload');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2 — Register.jsx : famoronana `photoThumb` amin'ny fisoratana anarana
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Register.jsx';
  let s = load(rel);

  if (s.includes('photoThumb')) {
    console.log('  ⏭  Register.jsx : efa voapatch');
  } else {
    s = rep(s,
      "import { uploadToTelegram } from '../utils/telegram';",
      "import { uploadToTelegram, makeThumb } from '../utils/telegram';",
      'Register:import');

    s = rep(s,
      `        if (profileFile) {
          const r = await uploadToTelegram(profileFile, p => setUploadPct(p));
          photoUpdates.photoURL = r.url;
        }`,
      `        if (profileFile) {
          const r = await uploadToTelegram(profileFile, p => setUploadPct(p));
          photoUpdates.photoURL = r.url;
          // Avatar Lite : vignette 160 px ho an'ny fampisehoana rehetra
          try {
            const th = await makeThumb(profileFile, 160);
            if (th) { const tr = await uploadToTelegram(th); photoUpdates.photoThumb = tr.url || ''; }
          } catch (e) { /* tsy manakana ny fisoratana anarana */ }
        }`,
      'Register:upload');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   3 — Saha denormalisé : mitahiry ny THUMB (43 toerana / 10 fichier)
   ═══════════════════════════════════════════════════════════════════════════ */
const WRITE = [
  { rel: 'src/pages/Home.jsx',              author: 3, from: 7 },
  { rel: 'src/pages/Messages.jsx',          author: 0, from: 7 },
  { rel: 'src/pages/Profile.jsx',           author: 2, from: 5 },
  { rel: 'src/pages/PostDetail.jsx',        author: 2, from: 4 },
  { rel: 'src/pages/GroupPage.jsx',         author: 1, from: 2 },
  { rel: 'src/pages/Friends.jsx',           author: 0, from: 3 },
  { rel: 'src/pages/Reels.jsx',             author: 1, from: 2 },
  { rel: 'src/pages/Events.jsx',            author: 1, from: 1 },
  { rel: 'src/pages/Announcements.jsx',     author: 1, from: 0 },
  { rel: 'src/components/ShareModal.jsx',   author: 0, from: 1 },
];

const AV = '(userProfile.photoThumb || userProfile.photoURL)';
let totalWrites = 0;

for (const w of WRITE) {
  let s = load(w.rel);
  const name = w.rel.split('/').pop();

  if (s.includes('userProfile.photoThumb ||')) { console.log('  ⏭  ' + name + ' : efa voapatch'); continue; }

  const reA = /authorPhoto:\s*userProfile\.photoURL/g;
  const reF = /fromPhoto:\s*userProfile\.photoURL/g;
  const nA = (s.match(reA) || []).length;
  const nF = (s.match(reF) || []).length;

  if (nA !== w.author || nF !== w.from) {
    throw new Error('ASSERTION FAIL [' + name + '] : nandrasana authorPhoto ' + w.author +
      ' / fromPhoto ' + w.from + ', nahitana ' + nA + ' / ' + nF +
      '\n→ Niova ny fichier. AJANONA, ary jereo.');
  }

  s = s.replace(reA, 'authorPhoto: ' + AV).replace(reF, 'fromPhoto: ' + AV);
  totalWrites += nA + nF;

  if (nA + nF > 0) { console.log('  • ' + name.padEnd(22) + ' ' + (nA + nF) + ' toerana'); save(w.rel, s); }
}

if (totalWrites !== 43 && totalWrites !== 0) {
  throw new Error('ASSERTION FAIL : nandrasana 43 fanoloana, nahitana ' + totalWrites);
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log('\n' + (DRY ? '✅ DRY-RUN : fanoloana ' + totalWrites + ' mety (tsy nisy nosoratana)'
                        : '✅ Patch vita — ' + totalWrites + ' toerana denormalisé'));
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
