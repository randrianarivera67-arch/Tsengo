#!/usr/bin/env node
// patch-remove-sera.cjs
// Manala tanteraka ny "Page Sera" avy amin'ny projet Tsengo
// Run: node patch-remove-sera.cjs

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
let ok = 0, fail = 0;

function log(msg)  { console.log(msg); }
function good(msg) { console.log('  ✅ ' + msg); ok++; }
function warn(msg) { console.log('  ⚠️  ' + msg); }
function err(msg)  { console.log('  ❌ ' + msg); fail++; }

function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { err(`Fichier introuvable: ${rel}`); return null; }
  return fs.readFileSync(p, 'utf8');
}

function write(rel, content) {
  fs.writeFileSync(path.join(ROOT, rel), content, 'utf8');
}

function replace(rel, from, to, label) {
  let src = read(rel);
  if (!src) return;
  if (!src.includes(from)) { warn(`Ancre introuvable (déjà patché?): ${label}`); return; }
  write(rel, src.replace(from, to));
  good(label);
}

function deleteFile(rel) {
  const p = path.join(ROOT, rel);
  if (fs.existsSync(p)) { fs.unlinkSync(p); good(`Supprimé: ${rel}`); }
  else warn(`Déjà absent: ${rel}`);
}

log('\n══════════════════════════════════════════');
log('  PATCH — Suppression Page Sera (Tsengo)');
log('══════════════════════════════════════════\n');

// ─────────────────────────────────────────
// 1. identity.js — forcer type:'user' toujours
// ─────────────────────────────────────────
log('【1】 identity.js — désactiver le mode page...');
write('src/utils/identity.js',
`// src/utils/identity.js — Page Sera supprimée, toujours type:'user'
const KEY = 'trengo_identity_v1';

export function getIdentity() {
  return { type: 'user' };
}

export function setIdentity() {
  try { localStorage.removeItem(KEY); } catch {}
}

export function subscribeIdentity(cb) {
  return () => {};
}
`);
good('identity.js neutralisé');

// ─────────────────────────────────────────
// 2. App.jsx — supprimer imports + routes Pages
// ─────────────────────────────────────────
log('\n【2】 App.jsx — supprimer imports PageMessages/Pages/PageDetail...');
replace(
  'src/App.jsx',
  `const PageMessages        = lazy(() => import('./pages/PageMessages'));`,
  ``,
  'Import PageMessages supprimé'
);
replace(
  'src/App.jsx',
  `const Pages              = lazy(() => import('./pages/Pages'));`,
  ``,
  'Import Pages supprimé'
);
replace(
  'src/App.jsx',
  `const PageDetail          = lazy(() => import('./pages/PageDetail'));`,
  ``,
  'Import PageDetail supprimé'
);

log('\n【3】 App.jsx — supprimer routes /pages...');
replace(
  'src/App.jsx',
  `        <Route path="/pages"          element={<PrivateRoute><Layout><Pages /></Layout></PrivateRoute>} />
        <Route path="/pages/:pageId"  element={<PrivateRoute><Layout><PageDetail /></Layout></PrivateRoute>} />
        <Route path="/pages/:pageId/messages" element={<PrivateRoute><PageMessages /></PrivateRoute>} />
        <Route path="/pages/:pageId/messages/:visitorUid" element={<PrivateRoute><PageMessages /></PrivateRoute>} />`,
  ``,
  'Routes /pages/* supprimées'
);

// ─────────────────────────────────────────
// 3. Layout.jsx — supprimer tout le bloc page-mode
// ─────────────────────────────────────────
log('\n【4】 Layout.jsx — nettoyer le mode page...');

// Import identity
replace(
  'src/components/Layout.jsx',
  `import { getIdentity, setIdentity, subscribeIdentity } from '../utils/identity';`,
  `import { getIdentity } from '../utils/identity';`,
  'Import setIdentity/subscribeIdentity retiré'
);

// myPagesList state
replace(
  'src/components/Layout.jsx',
  `  const [myPagesList, setMyPagesList] = useState([]);`,
  ``,
  'State myPagesList supprimé'
);

// identity state
replace(
  'src/components/Layout.jsx',
  `  const [identity, setIdentityState] = useState(getIdentity());`,
  `  const identity = { type: 'user' };`,
  'State identity figé sur user'
);

// Mes pages Sera useEffect
replace(
  'src/components/Layout.jsx',
  `  // Mes pages Sera (ho an'ny "Changer de profil")`,
  `  // Page Sera supprimée`,
  'Commentaire pages supprimé'
);

let layout = read('src/components/Layout.jsx');
if (layout) {
  // Remove the pages query useEffect block
  layout = layout.replace(
    /\/\/ Page Sera supprimée\s*\n\s*const q = query[\s\S]*?return \(\) => unsub\(\);\s*\n\s*\}, \[\]\);/m,
    `// Page Sera supprimée`
  );

  // isPageMode line
  layout = layout.replace(
    /\s*const isPageMode\s*=\s*identity\.type === 'page';/g,
    `\n  const isPageMode = false;`
  );

  // profilePath — simplify
  layout = layout.replace(
    /const profilePath\s*=\s*isPageMode \? `\/pages\/\$\{identity\.id\}` : `\/profile\/\$\{currentUser\?\.uid\}`;/,
    `const profilePath = \`/profile/\${currentUser?.uid}\`;`
  );

  // Remove "Changer de profil" block (myPagesList.length > 0 conditional)
  layout = layout.replace(
    /\{myPagesList\.length > 0 && \([\s\S]*?\)\s*\}\s*\n/m,
    ``
  );

  write('src/components/Layout.jsx', layout);
  good('Layout.jsx nettoyé (isPageMode, profilePath, bloc Changer de profil)');
}

// ─────────────────────────────────────────
// 4. Home.jsx — supprimer logique publication en tant que page
// ─────────────────────────────────────────
log('\n【5】 Home.jsx — supprimer la publication en tant que page...');

let home = read('src/pages/Home.jsx');
if (home) {
  // Remove getIdentity import
  home = home.replace(
    /import \{ getIdentity \} from '\.\.\/utils\/identity';\n/,
    ``
  );

  // Remove activeIdentity const
  home = home.replace(
    /\s*const activeIdentity = getIdentity\(\);\s*\/\/[^\n]*/g,
    ``
  );

  // Remove _idn / asPage block in createPost
  home = home.replace(
    /\s*const _idn = getIdentity\(\);\s*\n\s*const asPage = _idn\.type === 'page';\s*/g,
    `\n    const asPage = false;\n`
  );

  // Remove pageId/pageName/pagePhoto from post data
  home = home.replace(
    /\s*\.\.\.\(asPage \? \{ pageId: _idn\.id, pageName: _idn\.name, pagePhoto: _idn\.photoURL \|\| '', postedByPage: true \} : \{\}\),\n/g,
    ``
  );

  // Clean activeIdentity.type === 'page' block in JSX (header modal)
  home = home.replace(
    /\s*\{activeIdentity\.type === 'page' && \([\s\S]*?\)\s*\}\s*\n/m,
    ``
  );

  // Fix img src that uses activeIdentity
  home = home.replace(
    /src=\{\(activeIdentity\.type==='page' \? activeIdentity\.photoURL : userProfile\?\.photoURL\)\|[^}]+\}/,
    `src={userProfile?.photoURL || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(userProfile?.fullName||'U')}&background=1877F2&color=fff\`}`
  );

  // Remove Sera post header in fil (post.pageId block)
  home = home.replace(
    /\s*\) : post\.pageId \? \(\s*\n\s*\/\* Pub de Sera[\s\S]*?\/\* Pub de canal Artiste/m,
    `) : post.artistId ? (\n                /* Pub de canal Artiste`
  );

  write('src/pages/Home.jsx', home);
  good('Home.jsx nettoyé');
}

// ─────────────────────────────────────────
// 5. Supprimer les fichiers Pages Sera
// ─────────────────────────────────────────
log('\n【6】 Suppression fichiers Pages Sera...');
deleteFile('src/pages/Pages.jsx');
deleteFile('src/pages/PageDetail.jsx');
deleteFile('src/pages/PageMessages.jsx');

// ─────────────────────────────────────────
// 7. Layout.jsx — supprimer bloc Sera + remnant Changer de profil
// ─────────────────────────────────────────
log('\n【7】 Layout.jsx — supprimer bouton Sera et remnant...');
replace(
  'src/components/Layout.jsx',
  `        {/* Changer de profil (compte ↔ page Sera, toy ny Facebook) */}
                    </div>
          </div>
        )}

        {/* Sera (Pages) et Bloc-notes */}
        <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={() => { navigate('/pages'); setDrawerOpen(false); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '14px', textAlign: 'left', background: isDark ? '#15181F' : 'white', border: \`1.5px solid \${bdr}\`, borderRadius: 16, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <span className="icon-badge-3d" style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(145deg,#63A9FF,#1877F2)' }}>
              <HiIdentification size={22} color="white" />
            </span>
            <span style={{ fontWeight: 700, fontSize: 14, color: text }}>Sera</span>
            <span style={{ fontSize: 11, color: '#65676B', marginTop: -6 }}>Pages publiques</span>
          </button>
          <button onClick={() => { navigate('/notes'); setDrawerOpen(false); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '14px', textAlign: 'left', background: isDark ? '#15181F' : 'white', border: \`1.5px solid \${bdr}\`, borderRadius: 16, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <span className="icon-badge-3d" style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(145deg,#FFD84D,#F2B300)' }}>
              <HiDocumentText size={22} color="white" />
            </span>
            <span style={{ fontWeight: 700, fontSize: 14, color: text }}>Bloc-notes</span>
            <span style={{ fontSize: 11, color: '#65676B', marginTop: -6 }}>Vos notes privées</span>
          </button>
        </div>`,
  `        {/* Bloc-notes */}
        <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          <button onClick={() => { navigate('/notes'); setDrawerOpen(false); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '14px', textAlign: 'left', background: isDark ? '#15181F' : 'white', border: \`1.5px solid \${bdr}\`, borderRadius: 16, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <span className="icon-badge-3d" style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(145deg,#FFD84D,#F2B300)' }}>
              <HiDocumentText size={22} color="white" />
            </span>
            <span style={{ fontWeight: 700, fontSize: 14, color: text }}>Bloc-notes</span>
            <span style={{ fontSize: 11, color: '#65676B', marginTop: -6 }}>Vos notes privées</span>
          </button>
        </div>`,
  'Bloc Sera + remnant supprimé, Bloc-notes conservé'
);

// ─────────────────────────────────────────
// 8. Home.jsx — fix broken img src (double backtick from regex replace)
// ─────────────────────────────────────────
log('\n【8】 Home.jsx — corriger img src cassé...');
replace(
  'src/pages/Home.jsx',
  `\`}&background=1877F2&color=fff\`}`,
  `\`}`,
  'img src backtick dupliqué corrigé'
);


log('\n══════════════════════════════════════════');
log(`  Résultat: ${ok} ✅  ${fail} ❌`);
log('══════════════════════════════════════════');
if (fail === 0) {
  log('\n🎉 Patch terminé sans erreur!');
  log('   Exécute: npm run build\n');
} else {
  log('\n⚠️  Des erreurs sont survenues. Envoie ce log pour correction.\n');
}
