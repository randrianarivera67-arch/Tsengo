#!/usr/bin/env node
// patch-B.cjs — B1 Profile modal + B2 TextBg + B3 Annulé + B4 Stats

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
let ok = 0, fail = 0;
function good(m) { console.log('  ✅ ' + m); ok++; }
function skip(m) { console.log('  ⚠️  ' + m); }
function err(m)  { console.log('  ❌ ' + m); fail++; }
function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { err('Introuvable: ' + rel); return null; }
  return fs.readFileSync(p, 'utf8');
}
function write(rel, s) { fs.writeFileSync(path.join(ROOT, rel), s, 'utf8'); }
function rep(rel, from, to, label) {
  let s = read(rel); if (!s) return;
  if (!s.includes(from)) { skip('Ancre manquante: ' + label); return; }
  write(rel, s.replace(from, to)); good(label);
}

console.log('\n══════════════════════════════════════════════════');
console.log('  PATCH B — Profile modal + TextBg + Annulé + Stats');
console.log('══════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════
// B1a — Profile.jsx: J'aime ❤️ (tsy 👍)
// ═══════════════════════════════════════════
console.log('[B1a] Profile.jsx — J\'aime par défaut ❤️...');
rep('src/pages/Profile.jsx',
  "reactToPost(post.id, m || '👍')",
  "reactToPost(post.id, m || '❤️')",
  "quickLike → ❤️"
);
rep('src/pages/Profile.jsx',
  "style={myR ? { color: myR === '👍' ? '#1877F2' : '#FF2D8D', fontWeight:700 } : {}}>\n              {myR ? <span style={{ fontSize:17 }}>{myR}</span> : <NeonLike size={19}/>} J'aime",
  "style={myR ? { color: '#FF2D8D', fontWeight:700 } : {}}>\n              {myR ? <span style={{ fontSize:17 }}>{myR}</span> : <NeonLike size={19} color='#65676B'/>} J'aime",
  "NeonLike couleur Profile"
);

// ═══════════════════════════════════════════
// B1b — Profile.jsx: modal arrière-plan
// ═══════════════════════════════════════════
console.log('\n[B1b] Profile.jsx — modal arrière-plan au clic post...');
let prof = read('src/pages/Profile.jsx');
if (prof) {
  // 1. State selectedPost
  if (!prof.includes('selectedPost')) {
    prof = prof.replace(
      '  const [zoomPhoto,      setZoomPhoto]   = useState(null);',
      '  const [zoomPhoto,      setZoomPhoto]   = useState(null);\n  const [selectedPost,   setSelectedPost] = useState(null);'
    );
    good('selectedPost state');
  } else skip('selectedPost déjà là');

  // 2. onClick → setSelectedPost
  const oldClick = 'onClick={() => navigate(`/post/${post.id}`)}';
  if (prof.includes(oldClick)) {
    prof = prof.replace(oldClick, 'onClick={() => setSelectedPost(post)}');
    good('clic post → setSelectedPost');
  } else skip('onClick déjà modifié');

  // 3. Wrap return avec modal overlay
  const MARKER = '  return (\n    <div style={{ paddingBottom: 70 }}>';
  if (prof.includes(MARKER) && !prof.includes('selectedPost && (')) {
    const MODAL = [
      '  return (',
      '    <>',
      '      {selectedPost && (',
      '        <div onClick={() => setSelectedPost(null)} style={{',
      "          position:'fixed', inset:0, background:'rgba(0,0,0,0.88)',",
      '          zIndex:1000, overflowY:"auto", display:"flex",',
      "          alignItems:'flex-start', justifyContent:'center', padding:'16px 0 60px'",
      '        }}>',
      '          <div onClick={e => e.stopPropagation()} style={{',
      "            background:'white', borderRadius:16, width:'100%',",
      "            maxWidth:520, margin:'0 12px', overflow:'hidden'",
      '          }}>',
      "            <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>",
      '              <img src={profile.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName||"U")}&background=1877F2&color=fff`}',
      '                alt="" style={{ width:42,height:42,borderRadius:"50%",objectFit:"cover" }}/>',
      "              <div style={{ flex:1 }}>",
      "                <p style={{ fontWeight:700,fontSize:14 }}>{profile.fullName}</p>",
      "                <p style={{ fontSize:12,color:'#65676B' }}>{timeAgo(selectedPost.createdAt)}</p>",
      '              </div>',
      '              <button onClick={() => setSelectedPost(null)} style={{',
      "                background:'#F0F2F5',border:'none',borderRadius:'50%',",
      "                width:34,height:34,cursor:'pointer',fontSize:20,",
      "                display:'flex',alignItems:'center',justifyContent:'center'",
      '              }}>✕</button>',
      '            </div>',
      '            {selectedPost.content && (',
      '              selectedPost.textBg',
      '                ? <div style={{ background:selectedPost.textBg,minHeight:160,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 20px" }}>',
      '                    <p style={{ fontSize:22,fontWeight:800,color:"white",textAlign:"center" }}>{selectedPost.content}</p>',
      '                  </div>',
      "                : <p style={{ padding:'0 16px 10px',fontSize:15,lineHeight:1.6 }}>{selectedPost.content}</p>",
      '            )}',
      '            {selectedPost.mediaURL && (',
      "              selectedPost.mediaType==='image'",
      '                ? <img src={selectedPost.mediaURL} alt="" style={{ width:"100%",maxHeight:420,objectFit:"contain",background:"#000",display:"block" }}/>',
      '                : <video src={selectedPost.mediaURL} controls style={{ width:"100%",maxHeight:420,background:"#000",display:"block" }}/>',
      '            )}',
      '            <div className="post-actions-row">',
      "              <button onClick={() => reactToPost(selectedPost.id, selectedPost.reactions?.[currentUser.uid] || '❤️')} className='post-action-btn'>",
      "                <NeonLike size={19} color='#65676B'/> J'aime",
      '              </button>',
      '              <button onClick={() => navigate(`/post/${selectedPost.id}`)} className="post-action-btn">',
      '                <NeonComment size={18}/> Commenter',
      '              </button>',
      '              <button onClick={() => sharePost(selectedPost)} className="post-action-btn">',
      '                <NeonShare size={18}/> Partager',
      '              </button>',
      '            </div>',
      '          </div>',
      '        </div>',
      '      )}',
      '      <div style={{ paddingBottom: 70 }}>',
    ].join('\n');

    prof = prof.replace(MARKER, MODAL);

    // Fix closing: last </div> + ); + } → </div> </> ); }
    const lastClose = '    </div>\n  );\n}';
    const idx = prof.lastIndexOf(lastClose);
    if (idx !== -1) {
      prof = prof.slice(0, idx) + '    </div>\n    </>\n  );\n}';
    }
    good('Modal arrière-plan ajouté');
  } else skip('Modal déjà présent ou structure différente');

  write('src/pages/Profile.jsx', prof);
}

// ═══════════════════════════════════════════
// B3 — Profile.jsx: "Annulé" clicable
// ═══════════════════════════════════════════
console.log('\n[B3] Profile.jsx — "Annulé" clicable...');

rep('src/pages/Profile.jsx',
  '  async function sendFriendRequest() {',
  `  async function cancelFriendRequest() {
    try {
      await updateDoc(doc(db,'users',currentUser.uid), { sentRequests: arrayRemove(targetUid) });
      setUserProfile(p => ({ ...p, sentRequests: (p.sentRequests||[]).filter(id => id !== targetUid) }));
      setFriendStatus('none');
    } catch(e) { console.warn(e); }
  }

  async function sendFriendRequest() {`,
  'cancelFriendRequest() ajouté'
);

rep('src/pages/Profile.jsx',
  "{friendStatus==='requested'&&<span style={{ display:'inline-flex', alignItems:'center', background:'#F3F4F6', borderRadius:20, padding:'8px 16px', color:'#9CA3AF', fontSize:13 }}>Demande envoyée</span>}",
  "{friendStatus==='requested'&&<button onClick={cancelFriendRequest} style={{ display:'inline-flex', alignItems:'center', background:'#F3F4F6', border:'none', borderRadius:20, padding:'8px 16px', color:'#65676B', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Poppins' }}>Annulé</button>}",
  '"Annulé" clicable sur profil'
);

// Ensure arrayRemove imported
let profSrc = read('src/pages/Profile.jsx');
if (profSrc && !profSrc.includes('arrayRemove')) {
  profSrc = profSrc.replace(
    /import \{([^}]+)\} from 'firebase\/firestore';/,
    (m, inner) => {
      const parts = inner.split(',').map(s=>s.trim()).filter(Boolean);
      if (!parts.includes('arrayRemove')) parts.push('arrayRemove');
      return `import { ${parts.join(', ')} } from 'firebase/firestore';`;
    }
  );
  write('src/pages/Profile.jsx', profSrc);
  good('arrayRemove importé');
} else good('arrayRemove déjà présent ✓');

// ═══════════════════════════════════════════
// B2 — Home.jsx: mode texte couleur
// ═══════════════════════════════════════════
console.log('\n[B2] Home.jsx — mode texte couleur (fond coloré)...');

rep('src/pages/Home.jsx',
  "const REACTIONS   = ['❤️','😂','😮','😢','😡'];",
  `const REACTIONS   = ['❤️','😂','😮','😢','😡'];
const TEXT_BG_COLORS = [
  null,
  'linear-gradient(135deg,#1877F2,#42A5F5)',
  'linear-gradient(135deg,#E91E8C,#FF6BB5)',
  'linear-gradient(135deg,#FF7A00,#FFB347)',
  'linear-gradient(135deg,#00C853,#69F0AE)',
  'linear-gradient(135deg,#7C3AED,#A78BFA)',
  'linear-gradient(135deg,#D32F2F,#FF8A80)',
  'linear-gradient(135deg,#1A1A1A,#424242)',
];`,
  'TEXT_BG_COLORS définis'
);

rep('src/pages/Home.jsx',
  '  const [storyFile,      setStoryFile]      = useState(null);',
  '  const [storyFile,      setStoryFile]      = useState(null);\n  const [textBg,         setTextBg]         = useState(null);',
  'textBg state'
);

rep('src/pages/Home.jsx',
  "setText(''); setMedia(null); setMediaType(null); setLocation(null); setSaleMode(false); setPrice(''); setContact(''); setLieu(''); setPosting(false);",
  "setText(''); setMedia(null); setMediaType(null); setLocation(null); setSaleMode(false); setPrice(''); setContact(''); setLieu(''); setTextBg(null); setPosting(false);",
  'Reset textBg après post'
);

rep('src/pages/Home.jsx',
  '      content: text.trim(),\n      mediaURL,\n      mediaType: finalMediaType,',
  '      content: text.trim(),\n      textBg: textBg || null,\n      mediaURL,\n      mediaType: finalMediaType,',
  'textBg dans createPost data'
);

// Sélecteur couleur dans le formulaire
rep('src/pages/Home.jsx',
  "          {content.length > 0 && <p style={{ fontSize:11, color:charColor, textAlign:'right', marginTop:2 }}>{rem} restants</p>}",
  `          {content.length > 0 && <p style={{ fontSize:11, color:charColor, textAlign:'right', marginTop:2 }}>{rem} restants</p>}
          <div style={{ display:'flex', gap:6, marginTop:8, alignItems:'center' }}>
            <span style={{ fontSize:11, color:'#65676B' }}>Fond :</span>
            {TEXT_BG_COLORS.map((bg, i) => (
              <button key={i} onClick={() => setTextBg(bg)}
                style={{ width:22, height:22, borderRadius:'50%', padding:0, cursor:'pointer', flexShrink:0,
                  background: bg || '#ffffff',
                  border: textBg===bg ? '2.5px solid #050505' : '1.5px solid #E4E6EB' }}/>
            ))}
          </div>`,
  'Sélecteur couleur ajouté dans formulaire'
);

// Textarea avec fond coloré
rep('src/pages/Home.jsx',
  "            <textarea className=\"input\" placeholder={t('whatsOnMind')} value={content} onChange={e => setContent(e.target.value)} rows={3} style={{ resize:'none', width:'100%', border:'none', fontSize:17 }} maxLength={MAX_POST} autoFocus/>",
  `            {textBg ? (
              <div style={{ background:textBg, borderRadius:12, minHeight:120, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px 12px' }}>
                <textarea className="input" placeholder="Quoi de neuf ?" value={content} onChange={e => setContent(e.target.value)}
                  style={{ resize:'none', width:'100%', border:'none', fontSize:20, fontWeight:700, color:'white', textAlign:'center', background:'transparent', outline:'none' }} maxLength={MAX_POST} autoFocus/>
              </div>
            ) : (
              <textarea className="input" placeholder={t('whatsOnMind')} value={content} onChange={e => setContent(e.target.value)} rows={3} style={{ resize:'none', width:'100%', border:'none', fontSize:17 }} maxLength={MAX_POST} autoFocus/>
            )}`,
  'Textarea avec fond coloré'
);

// Affichage fond coloré dans le fil
rep('src/pages/Home.jsx',
  "        <div style={{ padding:'10px 16px', cursor:'pointer' }} onClick={() => navigate(`/post/${post.id}`)}>",
  "        <div style={{ padding: post.textBg ? 0 : '10px 16px', cursor:'pointer' }} onClick={() => navigate(`/post/${post.id}`)}>",
  'Padding conditionnel fond coloré'
);

rep('src/pages/Home.jsx',
  "          {post.content && (<>\n            <p style={{ fontSize:15, lineHeight:1.6, wordBreak:'break-word',",
  `          {post.content && (<>
            {post.textBg ? (
              <div style={{ background:post.textBg, minHeight:180, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 20px' }}>
                <p style={{ fontSize:22, fontWeight:800, color:'white', textAlign:'center', lineHeight:1.4, wordBreak:'break-word', margin:0 }}>{post.content}</p>
              </div>
            ) : (
            <p style={{ fontSize:15, lineHeight:1.6, wordBreak:'break-word',`,
  'Affichage fond coloré dans le fil'
);

rep('src/pages/Home.jsx',
  "            {post.content.length > 120 && (\n              <span onClick={e => { e.stopPropagation(); setExpandedPosts(pv => ({ ...pv, [post.id]: !pv[post.id] })); }}\n                style={{ fontSize:13, fontWeight:700, color:'#65676B', cursor:'pointer' }}>\n                {expandedPosts[post.id] ? 'Voir moins' : 'Voir plus'}\n              </span>\n            )}\n          </>)}",
  `            {post.content.length > 120 && !post.textBg && (
              <span onClick={e => { e.stopPropagation(); setExpandedPosts(pv => ({ ...pv, [post.id]: !pv[post.id] })); }}
                style={{ fontSize:13, fontWeight:700, color:'#65676B', cursor:'pointer' }}>
                {expandedPosts[post.id] ? 'Voir moins' : 'Voir plus'}
              </span>
            )}
            {!post.textBg && null}
          </>)}`,
  'Fermeture conditionnelle fond coloré'
);

// ═══════════════════════════════════════════
// B4 — Stats.jsx: plein écran + clicable
// ═══════════════════════════════════════════
console.log('\n[B4] Stats.jsx — plein écran + nombres clicables...');

rep('src/pages/Stats.jsx',
  "  const Card = ({ icon, label, value, sub, c1 = '#63A9FF', c2 = '#1877F2' }) => (",
  "  const Card = ({ icon, label, value, sub, c1 = '#63A9FF', c2 = '#1877F2', onClick }) => (",
  'Card onClick prop'
);

rep('src/pages/Stats.jsx',
  "    <div className=\"card\" style={{ padding: 14, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12 }}>",
  "    <div className=\"card\" onClick={onClick} style={{ padding: 14, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: onClick ? 'pointer' : 'default' }}>",
  'Card div clicable'
);

rep('src/pages/Stats.jsx',
  "      <span className=\"icon-badge-3d\" style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(145deg,${c1},${c2})`, flexShrink: 0 }}>",
  "      <span className=\"icon-badge-3d\" style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(145deg,${c1},${c2})`, flexShrink: 0, display:'flex', alignItems:'center', justifyContent:'center' }}>",
  'Card icon centré'
);

rep('src/pages/Stats.jsx',
  "        <p style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}>{Number(value).toLocaleString()}</p>",
  "        <p style={{ fontWeight: 800, fontSize: 24, lineHeight: 1, color:'#050505' }}>{Number(value).toLocaleString()}</p>",
  'Chiffres plus grands'
);

rep('src/pages/Stats.jsx',
  "    </div>\n  );\n\n  return (\n    <div style={{ padding: '14px 12px 30px' }}>",
  "      {onClick && <span style={{ color:'#1877F2', fontSize:18, marginLeft:'auto' }}>›</span>}\n    </div>\n  );\n\n  return (\n    <div style={{ minHeight:'100vh', padding:'0 0 80px', background:'#F0F2F5' }}>",
  'Flèche clicable + plein écran'
);

// Sticky header
rep('src/pages/Stats.jsx',
  "      <h2 style={{ fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>",
  "      <div style={{ position:'sticky', top:0, background:'white', zIndex:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid #E4E6EB', boxShadow:'0 1px 4px rgba(0,0,0,.06)', marginBottom:12 }}>\n      <h2 style={{ fontWeight: 800, fontSize: 17, display: 'flex', alignItems: 'center', gap: 10, margin:0 }}>",
  'Header sticky Stats'
);

rep('src/pages/Stats.jsx',
  "        Statistiques\n      </h2>\n      <p style={{ fontSize: 12, color: '#65676B', margin: '8px 0 14px' }}>Vue d'ensemble de votre compte et de vos publications</p>",
  "        Statistiques\n      </h2>\n      </div>",
  'Suppression subtitle remplacé par header sticky'
);

rep('src/pages/Stats.jsx',
  "      <p style={{ fontWeight: 800, fontSize: 14, margin: '4px 2px 8px' }}>Compte</p>\n      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>",
  "      <p style={{ fontWeight: 800, fontSize: 14, margin: '4px 12px 8px', color:'#050505' }}>Compte</p>\n      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, padding:'0 12px' }}>",
  'Compte section padding'
);

rep('src/pages/Stats.jsx',
  "        <Card icon={<HiUserGroup size={22} color=\"#fff\" />} label=\"Abonnés\" value={followers} c1=\"#63A9FF\" c2=\"#1877F2\" />",
  "        <Card icon={<HiUserGroup size={22} color=\"#fff\" />} label=\"Abonnés\" value={followers} c1=\"#63A9FF\" c2=\"#1877F2\" onClick={() => navigate('/friends')}/>",
  'Abonnés clicable'
);

rep('src/pages/Stats.jsx',
  "      <p style={{ fontWeight: 800, fontSize: 14, margin: '4px 2px 8px' }}>Publications <span style={{ fontSize: 12, color: '#65676B', fontWeight: 600 }}>{S.nPosts} au total</span></p>\n      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>",
  "      <p style={{ fontWeight: 800, fontSize: 14, margin: '16px 12px 8px', color:'#050505' }}>Publications <span style={{ fontSize: 12, color: '#65676B', fontWeight: 600 }}>{S.nPosts} au total</span></p>\n      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, padding:'0 12px' }}>",
  'Publications section padding'
);

// Top publications padding
rep('src/pages/Stats.jsx',
  "          <p style={{ fontWeight: 800, fontSize: 14, margin: '4px 2px 8px' }}>Meilleures publications</p>",
  "          <p style={{ fontWeight: 800, fontSize: 14, margin: '16px 12px 8px', color:'#050505' }}>Meilleures publications</p>",
  'Top posts titre padding'
);

rep('src/pages/Stats.jsx',
  "              <div key={p.id} onClick={() => navigate(`/post/${p.id}`)} className=\"card\" style={{ display: 'flex', gap: 10, padding: 10, marginBottom: 8, borderRadius: 14, cursor: 'pointer', alignItems: 'center' }}>",
  "              <div key={p.id} onClick={() => navigate(`/post/${p.id}`)} className=\"card\" style={{ display: 'flex', gap: 10, padding: 10, marginBottom: 8, borderRadius: 14, cursor: 'pointer', alignItems: 'center', margin:'0 12px 8px' }}>",
  'Top posts card margin'
);

console.log('\n══════════════════════════════════════════════════');
console.log(`  Résultat: ${ok} ✅  ${fail} ❌`);
console.log('══════════════════════════════════════════════════');
if (fail === 0) console.log('\n🎉 Patch B terminé! npm run build\n');
else console.log('\n⚠️  Erreur(s). Envoie ce log.\n');
