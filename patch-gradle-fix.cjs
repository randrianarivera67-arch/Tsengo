#!/usr/bin/env node
// patch-gradle-fix.cjs — Corrige la syntaxe Groovy du build.gradle (isDebuggable -> debuggable).
const fs=require('fs'); const path=require('path');
const REL='.github/workflows/build-apk.yml';
const p=path.join(process.cwd(),REL);
console.log('\n  FIX — build.gradle (Groovy)\n');
if(!fs.existsSync(p)){ console.log('  ❌ Introuvable: '+REL); process.exit(1); }
let s=fs.readFileSync(p,'utf8');
const from='debug { isDebuggable = true }';
const to='debug { debuggable true }';
if(s.includes(to)){ console.log('  ✅ Déjà corrigé'); }
else if(!s.includes(from)){ console.log('  ⚠️  Ancre manquante — envoie: grep -n isDebuggable '+REL); process.exit(1); }
else { fs.writeFileSync(p,s.replace(from,to),'utf8'); console.log('  ✅ isDebuggable -> debuggable'); }
console.log('\n  🎉 Commit + push, puis relance le workflow.\n');
