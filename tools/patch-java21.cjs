#!/usr/bin/env node
// patch-java21.cjs — Java 17 -> 21 (Capacitor 8 compile en Java 21).
const fs=require('fs'); const path=require('path');
const REL='.github/workflows/build-native.yml';
const p=path.join(process.cwd(),REL);
console.log('\n  FIX — Java 21 (workflow natif)\n');
if(!fs.existsSync(p)){ console.log('  \u274c Introuvable: '+REL); process.exit(1); }
let s=fs.readFileSync(p,'utf8');
const from='java-version: "17"';
const to='java-version: "21"';
if(s.includes(to)){ console.log('  \u2705 Déjà en 21'); }
else if(!s.includes(from)){ console.log('  \u26a0\ufe0f  Ancre manquante'); process.exit(1); }
else { fs.writeFileSync(p,s.replace(from,to),'utf8'); console.log('  \u2705 Java 17 -> 21'); }
console.log('\n  \ud83c\udf89 Commit + push, relance "Build Native APK".\n');
