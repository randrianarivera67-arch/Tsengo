// check-env.mjs — Fanamarinana ny environnement variables ho an'i Trengo
// Fampandehanana ao amin'ny Termux :  node check-env.mjs
//
// Mamaky ny .env eo an-toerana, mampitaha amin'ny 15 variable ampiasain'ny code,
// ary mamoaka lisitra vonona ho copié-collé mankany amin'ny Cloudflare.
//
// TSY mamoaka ny sanda feno amin'ny écran (masking) mba tsy hisy fiparitahana.
// Ampiasao `node check-env.mjs --full` raha tianao aseho tanteraka.

import fs from 'fs';

const FULL = process.argv.includes('--full');

const GROUPS = [
  {
    level: '🔴 TSY MAINTSY',
    note: 'Raha tsy misy → PAGE FOTSY (initializeApp mi-crash)',
    keys: [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_DATABASE_URL',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
    ],
  },
  {
    level: '🟠 ZAVA-DEHIBE',
    note: 'Fonctionnalité tapaka mangina raha tsy misy',
    keys: ['VITE_NOTIFY_SECRET', 'VITE_FIREBASE_VAPID_KEY'],
  },
  {
    level: '🟡 MISY FALLBACK',
    note: 'Mandeha na tsy misy aza, fa aleo apetraka mazava',
    keys: ['VITE_BACKEND_URL', 'VITE_MEDIA_URL'],
  },
  {
    level: '🟢 FONCTIONNALITÉ MANOKANA',
    note: 'Register (sary profil) sy OAuth YouTube',
    keys: [
      'VITE_CLOUDINARY_CLOUD_NAME',
      'VITE_CLOUDINARY_UPLOAD_PRESET',
      'VITE_GOOGLE_CLIENT_ID',
      'VITE_GOOGLE_REDIRECT_URI',
    ],
  },
];

// ── Mamaky ny fichier .env voalohany hita ────────────────────────────────────
const CANDIDATES = ['.env', '.env.local', '.env.production'];
let file = null, raw = '';
for (const f of CANDIDATES) {
  if (fs.existsSync(f)) { file = f; raw = fs.readFileSync(f, 'utf8'); break; }
}

if (!file) {
  console.log('❌ Tsy nahitana .env / .env.local / .env.production eto.');
  console.log('   Alaina avy amin\'ny Vercel (Settings → Environment Variables) aloha.');
  process.exit(1);
}

const env = {};
for (const line of raw.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 1) continue;
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.slice(0, i).trim()] = v;
}

const mask = (v) => (FULL ? v : (v.length <= 8 ? '•'.repeat(v.length) : v.slice(0, 4) + '…' + v.slice(-4)));

console.log('\n📄 Fichier : ' + file + '  (' + Object.keys(env).length + ' variable hita)\n');

let missing = [], critical = 0;

for (const g of GROUPS) {
  console.log(g.level + ' — ' + g.note);
  for (const k of g.keys) {
    const v = env[k];
    if (v) console.log('  ✔ ' + k.padEnd(34) + ' ' + mask(v));
    else {
      console.log('  ✘ ' + k.padEnd(34) + ' TSY MISY');
      missing.push(k);
      if (g.level.startsWith('🔴')) critical++;
    }
  }
  console.log('');
}

// ── Variable hafa ao amin'ny .env fa tsy ampiasain'ny code ───────────────────
const known = new Set(GROUPS.flatMap(g => g.keys));
const extra = Object.keys(env).filter(k => k.startsWith('VITE_') && !known.has(k));
if (extra.length) {
  console.log('ℹ️  Ao amin\'ny .env fa TSY ampiasain\'ny code (azo esorina) :');
  extra.forEach(k => console.log('    ' + k));
  console.log('');
}

console.log('─────────────────────────────────────────────');
if (critical > 0) {
  console.log('🔴 ' + critical + ' variable KRITIKA tsy ao → hisy PAGE FOTSY ny build.');
} else if (missing.length) {
  console.log('🟠 Mety ny fototra. ' + missing.length + ' variable tsy kritika no tsy ao.');
} else {
  console.log('✅ Feno daholo ny 15.');
}

if (FULL) {
  console.log('\n═══ Vonona ho copié-collé (Cloudflare → Build variables) ═══\n');
  for (const g of GROUPS) for (const k of g.keys) if (env[k]) console.log(k + '=' + env[k]);
  console.log('');
} else {
  console.log('\n💡 `node check-env.mjs --full` hahitana ny sanda feno vonona hocopié.');
  console.log('   ⚠️  Aza alefa amin\'ny chat na apetraka amin\'ny git ireo sanda ireo.');
}
