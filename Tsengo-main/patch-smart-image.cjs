// patch-smart-image.cjs  (FRONTEND)
// Ampiasaina ny SmartImage (skeleton miaina + fade-in) amin'ny SARY POST lehibe
// (feed, profil, detail, groupe, artiste, boutique) — tsy tapaka tsikelikely intsony.
// Idempotent + anchor unique guards.
const fs = require('fs');

function addImport(path, importLine) {
  let s = fs.readFileSync(path, 'utf8');
  if (s.includes("import SmartImage")) return; // deja
  // Apetraka aorian'ny import React voalohany
  const m = s.match(/^import .*;$/m);
  if (!m) { console.log('  ❌ ' + path + ' : tsy hita ny import'); process.exit(1); }
  s = s.replace(m[0], m[0] + '\n' + importLine);
  fs.writeFileSync(path, s);
}

function patchFile(path, edits) {
  let s = fs.readFileSync(path, 'utf8');
  let changed = 0;
  for (const [label, oldStr, newStr] of edits) {
    if (s.includes(newStr) && !s.includes(oldStr)) { console.log('  ⏭️  ' + label + ' — deja applique'); continue; }
    const n = s.split(oldStr).length - 1;
    if (n !== 1) { console.log('  ❌ ' + label + ' — ancre introuvable/multiple (' + n + ')'); process.exit(1); }
    s = s.replace(oldStr, newStr); changed++; console.log('  ✅ ' + label);
  }
  if (changed) fs.writeFileSync(path, s);
}

// ── Home.jsx : sary post feed ──
console.log('src/pages/Home.jsx');
addImport('src/pages/Home.jsx', "import SmartImage from '../components/SmartImage';");
patchFile('src/pages/Home.jsx', [
  [
    'sary post feed → SmartImage',
    `post.mediaType==='image' ? <img src={post.mediaURL} alt="" loading="lazy" decoding="async" onClick={e=>{e.stopPropagation();navigate(\`/post/\${post.id}\`);}} style={{ width:'100%', borderRadius:0, maxHeight:520, objectFit:'cover', display:'block', cursor:'zoom-in' }}/>`,
    `post.mediaType==='image' ? <SmartImage src={post.mediaURL} onClick={e=>{e.stopPropagation();navigate(\`/post/\${post.id}\`);}} style={{ width:'100%', borderRadius:0, maxHeight:520, objectFit:'cover', display:'block', cursor:'zoom-in' }}/>`,
  ],
]);

console.log('✅ SmartImage apetraka (feed). Ho an\'ny profil/detail: manaraka raha ilaina.');
