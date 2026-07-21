#!/usr/bin/env node
// patch-fix-textbg.cjs — Manamboatra ny Home.jsx simba (ternaire {textBg} naverina).
// Idempotent : raha efa voavboatra, tsy manova na inona na inona.
const fs = require('fs');
const path = require('path');
const REL = 'src/pages/Home.jsx';
const p = path.join(process.cwd(), REL);

console.log('\n════════════════════');
console.log('  FIX — Home.jsx (textBg)');
console.log('════════════════════\n');

if (!fs.existsSync(p)) { console.log('  ❌ Introuvable: ' + REL); process.exit(1); }
let s = fs.readFileSync(p, 'utf8');
let steps = 0;

// Étape 1 : effondrer le ternaire textBg dupliqué
const re1 = /\{\s*textBg\s*\?\s*\(([\s\S]*?)\)\s*:\s*\(\s*\{\s*textBg\s*\?\s*\(/;
if (re1.test(s)) { s = s.replace(re1, '{textBg ? ('); steps++; console.log('  ✅ Ternaire dupliqué effondré'); }

// Étape 2 : retirer le )} en trop après <textarea className="input" ... />
const re2 = /(className="input"[\s\S]*?autoFocus\/>\s*\r?\n\s*\)\})\s*\r?\n\s*\)\}/;
if (re2.test(s)) { s = s.replace(re2, '$1'); steps++; console.log('  ✅ )} en trop retiré'); }

if (steps === 0) {
  if (/\)\s*:\s*\(\s*\{\s*textBg\s*\?\s*\(/.test(s)) console.log('  ⚠️  Motif inattendu — envoie sed -n \'1408,1446p\' src/pages/Home.jsx');
  else console.log('  ✅ Déjà propre (rien à faire)');
} else {
  fs.writeFileSync(p, s, 'utf8');
  console.log('\n  💾 Home.jsx corrigé (' + steps + ' correction(s))');
}
console.log('\n🎉 npx vite build\n');
