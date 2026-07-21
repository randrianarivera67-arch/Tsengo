// cleanup-dead-files.cjs
// Mamafa ny fichiers MATY (voamarina fa tsy importés na aiza na aiza) :
//   - src/pages/Profile (1).jsx, *.bak, *.old
//   - src/utils/utils/  (doublons tranainy)
// TSY mikasika ny code velona mihitsy. Idempotent.
const fs = require('fs');

const DEAD = [
  'src/pages/Profile (1).jsx',
  'src/pages/Profile.jsx.bak',
  'src/pages/PostDetail.jsx.bak',
  'src/pages/Reels.jsx.bak',
  'src/pages/Register.jsx.old',
  'src/utils/utils/chat.js',
  'src/utils/utils/onesignal.js',
  'src/utils/utils/sound.js',
  'src/utils/utils/telegram.js',
];

// Fiarovana : hamarinina INDRAY fa tsy misy import mankany amin'ireo
const guard = ['Profile (1)', 'Profile.jsx.bak', 'PostDetail.jsx.bak', 'Reels.jsx.bak', 'Register.jsx.old', "utils/utils/"];
function scanImports(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    if (e.isDirectory()) { if (e.name !== 'node_modules') scanImports(p); continue; }
    if (!/\.(jsx?|cjs)$/.test(e.name)) continue;
    if (DEAD.includes(p.replace(/^\.\//, ''))) continue; // ny fichier maty mihitsy tsy isaina
    const s = fs.readFileSync(p, 'utf8');
    for (const g of guard) {
      if (s.includes(g)) { console.log('❌ ABANDON : ' + p + ' mbola miresaka "' + g + '" — tsy mamafa na inona na inona.'); process.exit(1); }
    }
  }
}
scanImports('./src');

let n = 0;
for (const f of DEAD) {
  if (fs.existsSync(f)) { fs.unlinkSync(f); console.log('🗑️  nofafana : ' + f); n++; }
  else console.log('⏭️  efa tsy misy : ' + f);
}
try { fs.rmdirSync('src/utils/utils'); console.log('🗑️  nofafana : src/utils/utils/'); } catch {}
console.log(n ? '✅ Madio ny code (' + n + ' fichier maty voafafa).' : '✅ Efa madio.');
