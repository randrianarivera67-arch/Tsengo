#!/usr/bin/env node
// patch-neonlike.cjs — NeonLike SVG bleu toujours (tsy emoji)

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
let ok = 0, fail = 0;
const good = m => { console.log('  ✅ ' + m); ok++; };
const skip = m => { console.log('  ⚠️  ' + m); };
const err  = m => { console.log('  ❌ ' + m); fail++; };
const read = rel => {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { err('Introuvable: ' + rel); return null; }
  return fs.readFileSync(p, 'utf8');
};
const write = (rel, s) => fs.writeFileSync(path.join(ROOT, rel), s, 'utf8');
const rep = (rel, from, to, label) => {
  const s = read(rel); if (!s) return;
  if (!s.includes(from)) { skip('Ancre manquante: ' + label); return; }
  write(rel, s.replace(from, to)); good(label);
};

console.log('\n══════════════════════════════════════════');
console.log('  PATCH — NeonLike SVG bleu + défaut ❤️');
console.log('══════════════════════════════════════════\n');

// ── Home.jsx ──
console.log('[1] Home.jsx...');

// 1a. Bouton J'aime: toujours NeonLike SVG bleu (tsy emoji)
rep('src/pages/Home.jsx',
  "                  style={myR ? { color: myR === '❤️' ? '#FF2D8D' : '#1877F2', fontWeight:700 } : {}}>\n                  {myR ? <span style={{ fontSize:17 }}>{myR}</span> : <NeonLike size={19} color={myR ? '#1877F2' : '#65676B'}/>} J'aime",
  "                  style={myR ? { color:'#1877F2', fontWeight:700 } : {}}>\n                  <NeonLike size={19} color={myR ? '#1877F2' : '#65676B'}/> J'aime",
  "Home: NeonLike SVG toujours (tsy emoji)"
);

// 1b. quickLike défaut ❤️ (vérification)
const h = read('src/pages/Home.jsx');
if (h && h.includes("reactToPost(post.id, myR || '❤️')")) {
  good("quickLike défaut ❤️ déjà correct ✓");
} else if (h && h.includes("reactToPost(post.id, myR || '👍')")) {
  rep('src/pages/Home.jsx',
    "reactToPost(post.id, myR || '👍')",
    "reactToPost(post.id, myR || '❤️')",
    "quickLike défaut → ❤️"
  );
} else {
  skip("quickLike — ancre non trouvée, vérifier manuellement");
}

// 1c. REACTIONS sans 👍
const h2 = read('src/pages/Home.jsx');
if (h2 && !h2.includes("'👍'")) {
  good("REACTIONS: pas de 👍 ✓");
} else {
  rep('src/pages/Home.jsx',
    "const REACTIONS   = ['❤️','😂','😮','😢','😡','👍'];",
    "const REACTIONS   = ['❤️','😂','😮','😢','😡'];",
    "REACTIONS sans 👍"
  );
}

// ── Profile.jsx ──
console.log('\n[2] Profile.jsx...');

// 2a. Bouton J'aime Profile: toujours NeonLike SVG bleu
rep('src/pages/Profile.jsx',
  "              style={myR ? { color: '#FF2D8D', fontWeight:700 } : {}}>\n              {myR ? <span style={{ fontSize:17 }}>{myR}</span> : <NeonLike size={19} color='#65676B'/>} J'aime",
  "              style={myR ? { color:'#1877F2', fontWeight:700 } : {}}>\n              <NeonLike size={19} color={myR ? '#1877F2' : '#65676B'}/> J'aime",
  "Profile: NeonLike SVG toujours (tsy emoji)"
);

// 2b. quickLike Profile défaut ❤️
const p = read('src/pages/Profile.jsx');
if (p && p.includes("reactToPost(post.id, m || '❤️')")) {
  good("Profile quickLike défaut ❤️ ✓");
} else {
  rep('src/pages/Profile.jsx',
    "reactToPost(post.id, m || '👍')",
    "reactToPost(post.id, m || '❤️')",
    "Profile quickLike → ❤️"
  );
}

// 2c. REACTIONS Profile sans 👍
const p2 = read('src/pages/Profile.jsx');
if (p2 && !p2.includes("'👍'") ) {
  good("Profile REACTIONS: pas de 👍 ✓");
} else {
  rep('src/pages/Profile.jsx',
    "const REACTIONS = ['❤️','😂','😮','😢','😡','👍'];",
    "const REACTIONS = ['❤️','😂','😮','😢','😡'];",
    "Profile REACTIONS sans 👍"
  );
}

// ── PostDetail.jsx ──
console.log('\n[3] PostDetail.jsx...');
const pd = read('src/pages/PostDetail.jsx');
if (pd) {
  let changed = false;
  let src = pd;
  // Fix J'aime SVG
  if (src.includes("{myR ? <span style={{ fontSize:17 }}>{myR}</span> : <NeonLike")) {
    src = src.replace(
      /{myR \? <span style=\{\{ fontSize:17 \}\}>\{myR\}<\/span> : <NeonLike[^/]+\/>} J'aime/g,
      "<NeonLike size={19} color={myR ? '#1877F2' : '#65676B'}/> J'aime"
    );
    changed = true;
  }
  if (src.includes("myR === '👍' ? '#1877F2'") || src.includes("myR === '❤️' ? '#FF2D8D'")) {
    src = src.replace(
      /style=\{myR \? \{ color: myR === '[^']+' \? '[^']+' : '[^']+', fontWeight:700 \} : \{\}\}/g,
      "style={myR ? { color:'#1877F2', fontWeight:700 } : {}}"
    );
    changed = true;
  }
  // Default ❤️
  if (src.includes("|| '👍'")) {
    src = src.replace(/\|\| '👍'/g, "|| '❤️'");
    changed = true;
  }
  // REACTIONS sans 👍
  if (src.includes("'👍'")) {
    src = src.replace("'❤️','😂','😮','😢','😡','👍'", "'❤️','😂','😮','😢','😡'");
    changed = true;
  }
  if (changed) { write('src/pages/PostDetail.jsx', src); good("PostDetail: NeonLike + ❤️ fixés"); }
  else good("PostDetail: déjà correct ✓");
}

console.log('\n══════════════════════════════════════════');
console.log(`  Résultat: ${ok} ✅  ${fail} ❌`);
console.log('══════════════════════════════════════════');
if (fail === 0) console.log('\n🎉 Terminé! npm run build\n');
else console.log('\n⚠️  Erreur(s). Envoie ce log.\n');
