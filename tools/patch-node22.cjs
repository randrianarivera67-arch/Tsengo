#!/usr/bin/env node
// patch-node22.cjs — Node 20 -> 22 dans le workflow natif (Capacitor CLI exige >=22).
const fs=require('fs'); const path=require('path');
const REL='.github/workflows/build-native.yml';
const p=path.join(process.cwd(),REL);
console.log('\n  FIX — Node 22 (workflow natif)\n');
if(!fs.existsSync(p)){ console.log('  ❌ Introuvable: '+REL); process.exit(1); }
let s=fs.readFileSync(p,'utf8');
const from='node-version: "20"';
const to='node-version: "22"';
if(s.includes(to)){ console.log('  ✅ Déjà en 22'); }
else if(!s.includes(from)){ console.log('  ⚠️  Ancre manquante'); process.exit(1); }
else { fs.writeFileSync(p,s.replace(from,to),'utf8'); console.log('  ✅ Node 20 -> 22'); }
console.log('\n  🎉 Commit + push, puis relance "Build Native APK".\n');
