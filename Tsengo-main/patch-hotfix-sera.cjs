#!/usr/bin/env node
// patch-hotfix-sera.cjs — Manamboatra ny white screen crash
// Antony: subscribeIdentity + setIdentityState mbola ao Layout.jsx

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
let ok = 0, fail = 0;

function good(m) { console.log('  ✅ ' + m); ok++; }
function err(m)  { console.log('  ❌ ' + m); fail++; }
function skip(m) { console.log('  ⚠️  ' + m); }

function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { err('Introuvable: ' + rel); return null; }
  return fs.readFileSync(p, 'utf8');
}
function write(rel, s) { fs.writeFileSync(path.join(ROOT, rel), s, 'utf8'); }

console.log('\n══════════════════════════════════════');
console.log('  HOTFIX — White screen crash (Sera)');
console.log('══════════════════════════════════════\n');

let layout = read('src/components/Layout.jsx');
if (!layout) process.exit(1);

// 1. Supprimer l'useEffect cassé (subscribeIdentity + setIdentityState inexistants)
if (layout.includes('useEffect(() => subscribeIdentity(setIdentityState), []);')) {
  layout = layout.replace(
    'useEffect(() => subscribeIdentity(setIdentityState), []);',
    '// Page Sera supprimée — subscribeIdentity retiré'
  );
  good('useEffect subscribeIdentity supprimé');
} else {
  skip('subscribeIdentity useEffect déjà absent');
}

// 2. Import getIdentity inutile — retiré
if (layout.includes("import { getIdentity } from '../utils/identity';")) {
  layout = layout.replace(
    "import { getIdentity } from '../utils/identity';",
    '// identity.js neutralisé — import retiré'
  );
  good("import getIdentity retiré");
} else {
  skip('import getIdentity déjà absent');
}

// 3. const identity = { type: 'user' } — déjà bon, vérifier
if (layout.includes("const identity = { type: 'user' };")) {
  good("const identity figé sur user ✓");
} else if (layout.includes("useState(getIdentity())")) {
  layout = layout.replace(
    /const \[identity, setIdentityState\] = useState\(getIdentity\(\)\);/,
    "const identity = { type: 'user' };"
  );
  good("identity state remplacé par constante");
} else {
  skip("identity déjà corrigé ou introuvable");
}

// 4. isPageMode = false — déjà bon normalement
if (!layout.includes('const isPageMode = false;')) {
  layout = layout.replace(
    /const isPageMode\s*=\s*identity\.type === 'page';/,
    'const isPageMode = false;'
  );
  good('isPageMode forcé à false');
} else {
  good('isPageMode = false déjà présent ✓');
}

// 5. Supprimer import useState si plus utilisé pour identity
// (useState peut encore servir pour d'autres states — on ne le retire pas)

write('src/components/Layout.jsx', layout);

// ── Vérifier Home.jsx aussi ──
let home = read('src/pages/Home.jsx');
if (home) {
  let changed = false;

  // Supprimer getIdentity import si encore présent
  if (home.includes("import { getIdentity } from '../utils/identity';")) {
    home = home.replace(
      "import { getIdentity } from '../utils/identity';\n",
      ''
    );
    changed = true;
    good('Home.jsx: import getIdentity retiré');
  }

  // activeIdentity encore présent ?
  if (home.includes('getIdentity()')) {
    home = home.replace(/const activeIdentity = getIdentity\(\);[^\n]*/g, '');
    home = home.replace(/getIdentity\(\)/g, '{ type: \'user\' }');
    changed = true;
    good('Home.jsx: getIdentity() résiduel nettoyé');
  }

  if (changed) write('src/pages/Home.jsx', home);
  else good('Home.jsx: propre ✓');
}

// ── identity.js — s'assurer qu'il ne plante pas ──
write('src/utils/identity.js',
`// src/utils/identity.js — Page Sera supprimée
const KEY = 'trengo_identity_v1';
// Nettoyer localStorage au cas où un user avait type:'page' sauvegardé
try { localStorage.removeItem(KEY); } catch {}

export function getIdentity() { return { type: 'user' }; }
export function setIdentity() { try { localStorage.removeItem(KEY); } catch {} }
export function subscribeIdentity(cb) { return () => {}; }
`);
good('identity.js réécrit (localStorage.removeItem au chargement)');

console.log('\n══════════════════════════════════════');
console.log(`  Résultat: ${ok} ✅  ${fail} ❌`);
console.log('══════════════════════════════════════');
if (fail === 0) {
  console.log('\n🎉 Hotfix appliqué! Exécute: npm run build\n');
} else {
  console.log('\n⚠️  Erreur. Envoie ce log.\n');
}
