/**
 * patch-notify-all-front.cjs   —  FRONTEND (Tsengo-fresh)
 * ─────────────────────────────────────────────────────────────────────────────
 * BUT : rehefa ny ADMIN no mamoaka publication ao amin'ny feed, dia antsoina
 *       ny route /notify-all → push + notification anaty app ho an'ny rehetra.
 *
 * FIAROVANA : ID token Firebase no alefa (Authorization: Bearer …), fa TSY ny
 *       `x-notify-secret` izay hita ao anaty bundle public.
 *
 * TSY MANAKANA : raha tsy mety ny diffusion dia mbola tafita ihany ny
 *       publication — `.catch()` mangina, tsy misy alert.
 *
 * FICHIERS : src/utils/onesignal.js , src/pages/Home.jsx
 *
 * Fampandehanana :  node patch-notify-all-front.cjs --dry
 *                   node patch-notify-all-front.cjs
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
      '\n--- old ---\n' + old.slice(0, 200) + '\n-----------');
  }
  return src.replace(old, neo);
}

const files = {};
const touched = [];
const load = (r) => (files[r] = files[r] || read(P(r)));
const save = (r, s) => { files[r] = s; if (!touched.includes(r)) touched.push(r); };

/* ═══════════════════════════════════════════════════════════════════════════
   1 — utils/onesignal.js : helper notifyAllUsers
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/utils/onesignal.js';
  let s = load(rel);

  if (s.includes('export async function notifyAllUsers')) {
    console.log('  ⏭  onesignal.js : efa voapatch');
  } else {
    // import auth
    s = rep(s,
      "import app, { db } from '../firebase';",
      "import app, { db, auth } from '../firebase';",
      'onesignal:import');

    // helper vaovao aorian'ny sendPushNotification
    const ANCHOR = 'export async function sendPushNotification(';
    const HELPER = `/**
 * Diffusion ADMIN → mpampiasa REHETRA (push + notification anaty app).
 *
 * Ny fanamarinana dia atao AO AMIN'NY BACKEND amin'ny ID token Firebase :
 * ny \`x-notify-secret\` dia hita ao anaty bundle public, ka tsy azo itokisana
 * ho an'ny diffusion. Raha tsy admin ilay mpiantso dia mamaly 403 ny serveur.
 *
 * Tsy manakana : raha tsy mety dia tsy manelingelina ny publication.
 */
export async function notifyAllUsers({ title, message, postId, fromName, fromPhoto }) {
  const u = auth.currentUser;
  if (!u || !title || !message) return { skipped: true };

  const send = async () => {
    const idToken = await u.getIdToken();
    const r = await fetch(\`\${BACKEND_URL}/notify-all\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${idToken}\` },
      body: JSON.stringify({
        title,
        message,
        postId: postId || '',
        fromName: fromName || '',
        fromPhoto: fromPhoto || '',
      }),
      keepalive: true,
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  };

  try {
    return await send();
  } catch (err) {
    // Retry tokana (ohatra : Render mifoha avy amin'ny torimaso)
    try {
      await new Promise(res => setTimeout(res, 2500));
      return await send();
    } catch (e2) {
      console.warn('Diffusion admin échouée :', e2?.message || e2);
      return { error: true };
    }
  }
}

`;
    s = rep(s, ANCHOR, HELPER + ANCHOR, 'onesignal:helper');
    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2 — pages/Home.jsx : antso aorian'ny famoahana publication (lalana 2)
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = load(rel);

  if (s.includes('notifyAllUsers')) {
    console.log('  ⏭  Home.jsx : efa voapatch');
  } else {
    // import
    s = rep(s,
      "import { sendPushNotification } from '../utils/onesignal';",
      "import { sendPushNotification, notifyAllUsers } from '../utils/onesignal';",
      'Home:import');

    // Lalana 1 : publishPost() — sary tokana / video / lahatsoratra
    s = rep(s,
      "      addPin(postRef.id);                 // post-nao VAO NALEFA → mipetaka ambony (ho anao) mandra-pahavitan'ny refresh manaraka",
      `      addPin(postRef.id);                 // post-nao VAO NALEFA → mipetaka ambony (ho anao) mandra-pahavitan'ny refresh manaraka
      // ── Publication ADMIN → mahazo notification ny mpampiasa REHETRA ──
      if (userProfile?.isAdmin) {
        notifyAllUsers({
          title: 'Trengo',
          message: (fields.content || '').trim().slice(0, 120) || \`\${authorName} a publié une annonce\`,
          postId: postRef.id, fromName: authorName, fromPhoto: authorPhoto,
        }).catch(() => {});
      }`,
      'Home:broadcast-1');

    // Lalana 2 : sary maro (2–10)
    s = rep(s,
      "        addPin(postRef.id);               // post-nao VAO NALEFA → mipetaka ambony (ho anao)",
      `        addPin(postRef.id);               // post-nao VAO NALEFA → mipetaka ambony (ho anao)
        // ── Publication ADMIN → mahazo notification ny mpampiasa REHETRA ──
        if (userProfile?.isAdmin) {
          notifyAllUsers({
            title: 'Trengo',
            message: (fields.content || '').trim().slice(0, 120) || \`\${authorName} a publié une annonce\`,
            postId: postRef.id, fromName: authorName, fromPhoto: authorPhoto,
          }).catch(() => {});
        }`,
      'Home:broadcast-2');

    save(rel, s);
  }
}

/* ── Fanamarinana farany : tsy misy import miverina ─────────────────────── */
for (const r of touched) {
  const c = (files[r].match(/^import .*onesignal';$/gm) || []).length;
  if (c > 1) throw new Error('IMPORT DOUBLON [' + r + '] : ' + c);
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
