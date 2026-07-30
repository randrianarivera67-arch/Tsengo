// Ajoute le bouton BLEU "Booster" sous chaque publication du profil (proprietaire
// uniquement), en plus du menu "..." deja corrige. Edition ciblee (pas d'ecrasement).
const fs = require('fs');
const p = 'src/pages/Profile.jsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('Booster la publication')) {
  console.log('SKIP deja present');
  process.exit(0);
}

const old = `          <button onClick={() => sharePost(post)} className='post-action-btn'>
            <NeonShare size={18}/> Partager
          </button>
        </div>

        {openCmt[post.id] && (`;

const neu = `          <button onClick={() => sharePost(post)} className='post-action-btn'>
            <NeonShare size={18}/> Partager
          </button>
        </div>

        {isOwnPost && !boosted && (
          <div style={{ padding:'0 16px 12px' }}>
            <button
              onClick={() => setBoostTarget({ type:'post', id: post.id, ownerUid: post.uid, title: (post.content||'').slice(0,60) || 'Votre publication', thumbnailURL: post.mediaURL || '' })}
              style={{ width:'100%', padding:'9px 0', borderRadius:20, border:'none', background:'linear-gradient(135deg,#1B84FF,#1877F2)', color:'white', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'Poppins' }}>
              <HiLightningBolt size={16}/> Booster la publication
            </button>
          </div>
        )}

        {openCmt[post.id] && (`;

const n = s.split(old).length - 1;
if (n !== 1) {
  console.log('FAIL ancre trouvee ' + n + ' fois (attendu 1)');
  process.exit(1);
}
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log('OK bouton bleu Booster ajoute sous chaque publication (proprietaire, non deja booste)');
