// Corrige le bouton "Booster" du menu de post dans Profile.jsx (edition ciblee,
// PAS d'ecrasement complet du fichier -> aucun risque pour le reste du fichier).
const fs = require('fs');
let OK = 0, SKIP = 0, FAIL = 0;
const ok = (m) => { OK++; console.log('OK ' + m); };
const skip = (m) => { SKIP++; console.log('SKIP ' + m); };
const fail = (m) => { FAIL++; console.log('FAIL ' + m); };

try {
  const p = 'src/pages/Profile.jsx';
  let s = fs.readFileSync(p, 'utf8');

  if (s.includes("import BoostOrderModal")) {
    skip('Profile.jsx : bouton Booster deja mis a jour');
  } else {
    let n = 0;

    // 1) import
    const a1 = "import ShareModal from '../components/ShareModal';";
    if (!s.includes(a1)) throw new Error('ancre import ShareModal introuvable');
    s = s.replace(a1, a1 + "\nimport BoostOrderModal from '../components/BoostOrderModal';");
    n++;

    // 2) state boostTarget (a cote de selectedPost)
    const a2 = "  const [selectedPost,   setSelectedPost] = useState(null);";
    if (!s.includes(a2)) throw new Error('ancre state selectedPost introuvable');
    s = s.replace(a2, a2 + "\n  const [boostTarget,    setBoostTarget]   = useState(null); // { type, id, ownerUid, title, thumbnailURL }");
    n++;

    // 3) bouton Booster : ouvre le formulaire au lieu de naviguer vers /boost
    const a3 = "<button onClick={() => { navigate('/boost'); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:14, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}><HiLightningBolt size={15} color=\"#a855f7\"/> Booster</button>";
    if (!s.includes(a3)) throw new Error('ancre bouton Booster introuvable');
    const n3 = "<button onClick={() => { setBoostTarget({ type:'post', id: post.id, ownerUid: post.uid, title: (post.content||'').slice(0,60) || 'Votre publication', thumbnailURL: post.mediaURL || '' }); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:14, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}><HiLightningBolt size={15} color=\"#a855f7\"/> Booster</button>";
    s = s.replace(a3, n3);
    n++;

    // 4) rendu du modal : juste avant la fermeture finale du composant
    const a4 = "        onClose={() => setFollowListOpen(null)}\n        />\n      )}\n    </div>\n  </>\n  );";
    if (s.includes(a4)) {
      const n4 = "        onClose={() => setFollowListOpen(null)}\n        />\n      )}\n      {boostTarget && (\n        <BoostOrderModal target={boostTarget} onClose={() => setBoostTarget(null)} />\n      )}\n    </div>\n  </>\n  );";
      s = s.replace(a4, n4);
      n++;
    } else {
      console.log('ATTENTION: ancre de fin de fichier non trouvee automatiquement.');
      console.log('Le bouton Booster est corrige, mais le <BoostOrderModal/> doit etre ajoute manuellement.');
      console.log('Ajoute ceci juste avant le dernier `</>);` du fichier :');
      console.log('  {boostTarget && <BoostOrderModal target={boostTarget} onClose={() => setBoostTarget(null)} />}');
    }

    fs.writeFileSync(p, s);
    ok('Profile.jsx : ' + n + ' modifications (bouton Booster -> formulaire de commande)');
  }
} catch (e) { fail('Profile.jsx: ' + e.message); }

console.log('\nRESUME: OK=' + OK + ' SKIP=' + SKIP + ' FAIL=' + FAIL);
