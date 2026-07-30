/**
 * patch-notify-idtoken-front.cjs   —  FRONTEND
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ ALEFA AORIAN'NY BACKEND. Ny backend dia manaiky ny roa (ID token sy secret)
 *    mandritra ny fifindrana, ka tsy misy tapaka na inona no alefa aloha.
 *    FA raha ny frontend no alefa nefa tsy mbola voapatch ny backend, dia
 *    handà ny antso ny serveur (403) → tapaka ny push.
 *
 * OLANA : `VITE_NOTIFY_SECRET` dia tafiditra ao anaty bundle JavaScript public.
 *         Izay manokatra DevTools dia mahita azy, ka afaka mandefa push amin'ny
 *         mpampiasa rehetra, amin'ny anaran'iza na iza.
 *
 * VAHAOLANA : Firebase ID token no alefa (`Authorization: Bearer …`).
 *         Ny serveur no manamarina amin'i Google. ESORINA tanteraka ny secret
 *         ao amin'ny bundle.
 *
 * VOAKASIKA :
 *   • utils/onesignal.js  → sendPushNotification
 *   • utils/nativePush.js → sendTestPush + diagnostic
 *
 * TSY VOAKASIKA :
 *   • public/firebase-messaging-sw.js — maka ny secret avy amin'ny PAYLOAD push
 *     (`d.ns`), tsy avy amin'ny bundle. Ny "réponse rapide" avy amin'ny
 *     notification dia mbola mampiasa azy.
 *     ⚠️ Midika izany fa TSY VITA TANTERAKA ny fiarovana : ny mpampiasa mandray
 *     push dia mahazo ny secret ao anaty payload. Ambony lavitra noho ny
 *     "misokatra DevTools" ny sakana, fa mbola misy. Asa manaraka : ovaina ny
 *     fomba fiasan'ny "réponse rapide" ao amin'ny SW.
 *
 * Fampandehanana :  node patch-notify-idtoken-front.cjs --dry
 *                   node patch-notify-idtoken-front.cjs
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
   1 — utils/onesignal.js
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/utils/onesignal.js';
  let s = load(rel);

  if (s.includes('authHeader')) {
    console.log('  ⏭  onesignal.js : efa voapatch');
  } else {
    // Esorina ny constante secret, soloina helper
    s = rep(s,
      "const NOTIFY_SECRET = import.meta.env.VITE_NOTIFY_SECRET || '';",
      `/**
 * En-tête fanamarinana ho an'ny backend.
 * ID token Firebase — voamarina amin'i Google, tsy azo foronina.
 * TSY MISY SECRET AO ANATY BUNDLE INTSONY.
 */
async function authHeader() {
  const u = auth.currentUser;
  if (!u) return null;                       // tsy tafiditra → tsy mandefa
  try {
    return { 'Content-Type': 'application/json', Authorization: \`Bearer \${await u.getIdToken()}\` };
  } catch (e) { return null; }
}`,
      'onesignal:const');

    // Antso /notify
    s = rep(s,
      `  const send = () => fetch(\`\${BACKEND_URL}/notify\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-notify-secret': NOTIFY_SECRET },`,
      `  const send = async () => fetch(\`\${BACKEND_URL}/notify\`, {
    method: 'POST',
    headers: (await authHeader()) || { 'Content-Type': 'application/json' },`,
      'onesignal:fetch');

    // Commentaire efa lany daty : ny secret dia tsy ampiasaina intsony na aiza
    s = rep(s,
      " * Ny fanamarinana dia atao AO AMIN'NY BACKEND amin'ny ID token Firebase :\n * ny `x-notify-secret` dia hita ao anaty bundle public, ka tsy azo itokisana\n * ho an'ny diffusion. Raha tsy admin ilay mpiantso dia mamaly 403 ny serveur.",
      " * Ny fanamarinana dia atao AO AMIN'NY BACKEND amin'ny ID token Firebase.\n * Raha tsy admin ilay mpiantso dia mamaly 403 ny serveur.",
      'onesignal:comment');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2 — utils/nativePush.js
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/utils/nativePush.js';
  let s = load(rel);

  if (s.includes('Authorization')) {
    console.log('  ⏭  nativePush.js : efa voapatch');
  } else {
    s = rep(s,
      "import { db } from '../firebase';",
      "import { db, auth } from '../firebase';",
      'native:import');

    s = rep(s,
      "const NOTIFY_SECRET = import.meta.env.VITE_NOTIFY_SECRET || '';",
      `/** ID token Firebase — tsy misy secret ao anaty bundle intsony. */
async function authHeader() {
  const u = auth.currentUser;
  if (!u) return null;
  try {
    return { 'Content-Type': 'application/json', Authorization: \`Bearer \${await u.getIdToken()}\` };
  } catch (e) { return null; }
}`,
      'native:const');

    s = rep(s,
      "      headers: { 'Content-Type': 'application/json', 'x-notify-secret': NOTIFY_SECRET },",
      "      headers: (await authHeader()) || { 'Content-Type': 'application/json' },",
      'native:fetch');

    s = rep(s,
      '    hasSecret: !!NOTIFY_SECRET,',
      '    hasAuth: !!auth.currentUser,',
      'native:diag');

    save(rel, s);
  }
}

/* ── Fanamarinana farany : tsy misy secret sisa (ankoatra ny commentaire) ── */
const stripComments = (t) => t.split('\n')
  .filter(l => {
    const x = l.trim();
    return !(x.startsWith('*') || x.startsWith('//') || x.startsWith('/*'));
  }).join('\n');

for (const r of touched) {
  const code = stripComments(files[r]);
  if (code.includes('VITE_NOTIFY_SECRET')) {
    throw new Error('FAIL [' + r + '] : mbola misy VITE_NOTIFY_SECRET ao anaty code');
  }
  if (code.includes('x-notify-secret')) {
    throw new Error('FAIL [' + r + '] : mbola misy x-notify-secret ao anaty code');
  }
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
