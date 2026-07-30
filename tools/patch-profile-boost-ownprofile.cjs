// Ajoute le bouton "Booster mon profil" dans l'en-tete (branche isOwn), a cote
// de "Modifier le profil". Edition ciblee, aucun ecrasement de fichier.
const fs = require('fs');
const p = 'src/pages/Profile.jsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('Booster mon profil')) {
  console.log('SKIP deja present');
  process.exit(0);
}

const old = `                <button onClick={() => setEditing(true)} style={{ display:'inline-flex', alignItems:'center', gap:6, background:"linear-gradient(180deg,#1B84FF,#1877F2)", border:"none", borderRadius:20, padding:'8px 18px', color:"white", fontWeight:600, cursor:'pointer', fontSize:13, boxShadow:"0 3px 12px rgba(24,119,242,.35)" }}><HiPencil size={14}/>{t('editProfile')}</button>
                <div style={{ position:'relative', display:'inline-block' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setProfMenu(p => !p)} style={{ width:36, height:36, borderRadius:'50%', background:'#F0F2F5', border:'none', cursor:'pointer', color:'#050505', display:'flex', alignItems:'center', justifyContent:'center' }}><HiDotsVertical size={17}/></button>`;

const neu = `                <button onClick={() => setEditing(true)} style={{ display:'inline-flex', alignItems:'center', gap:6, background:"linear-gradient(180deg,#1B84FF,#1877F2)", border:"none", borderRadius:20, padding:'8px 18px', color:"white", fontWeight:600, cursor:'pointer', fontSize:13, boxShadow:"0 3px 12px rgba(24,119,242,.35)" }}><HiPencil size={14}/>{t('editProfile')}</button>
                <button onClick={() => setBoostTarget({ type:'profile', id: currentUser.uid, ownerUid: currentUser.uid, title: profile.fullName || 'Mon profil', thumbnailURL: profile.photoURL || '' })}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#1B84FF,#1877F2)', border:'none', borderRadius:20, padding:'8px 16px', color:'white', fontWeight:700, cursor:'pointer', fontSize:13, fontFamily:'Poppins' }}>
                  <HiLightningBolt size={14}/> Booster mon profil
                </button>
                <div style={{ position:'relative', display:'inline-block' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setProfMenu(p => !p)} style={{ width:36, height:36, borderRadius:'50%', background:'#F0F2F5', border:'none', cursor:'pointer', color:'#050505', display:'flex', alignItems:'center', justifyContent:'center' }}><HiDotsVertical size={17}/></button>`;

const n = s.split(old).length - 1;
if (n !== 1) {
  console.log('FAIL ancre trouvee ' + n + ' fois (attendu 1)');
  process.exit(1);
}
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log('OK bouton "Booster mon profil" ajoute (en-tete, isOwn)');
