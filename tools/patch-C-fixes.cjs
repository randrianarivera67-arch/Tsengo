#!/usr/bin/env node
// patch-C-fixes.cjs — Vérification profonde + fixes précis
// 1. Profile: REACTIONS sans 👍, J'aime SVG neon, modal arrière-plan
// 2. ShopDetail + ArtistDetail: Stats plein écran, SVG NeonIcons, donut + bar chart

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
let ok = 0, warn = 0, fail = 0;
const good = m => { console.log('  ✅ ' + m); ok++; };
const skip = m => { console.log('  ⚠️  ' + m); warn++; };
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

console.log('\n═══════════════════════════════════════════════════');
console.log('  PATCH C-FIXES — Vérification + Stats + Profile');
console.log('═══════════════════════════════════════════════════\n');

// ══════════════════════════════════
// 【1】 PROFILE.jsx — fixes précis
// ══════════════════════════════════
console.log('【1】 Profile.jsx...');

// 1a. Supprimer 👍 de REACTIONS
rep('src/pages/Profile.jsx',
  "const REACTIONS = ['❤️','😂','😮','😢','😡','👍'];",
  "const REACTIONS = ['❤️','😂','😮','😢','😡'];",
  "REACTIONS sans 👍"
);

// 1b. J'aime commentaire → ❤️ par défaut
rep('src/pages/Profile.jsx',
  "    <span onClick={() => reactToCmt(post.id, c.id, '👍')} style={{ cursor:'pointer', color: c.reactions?.[currentUser.uid] ? (c.reactions[currentUser.uid]==='👍'?'#1877F2':'#FF2D8D') : '#65676B' }}>\n                      {c.reactions?.[currentUser.uid] && c.reactions[currentUser.uid] !== '👍' ? c.reactions[currentUser.uid] + ' ' : ''}J'aime",
  "    <span onClick={() => reactToCmt(post.id, c.id, c.reactions?.[currentUser.uid] || '❤️')} style={{ cursor:'pointer', color: c.reactions?.[currentUser.uid] ? '#FF2D8D' : '#65676B', fontWeight: c.reactions?.[currentUser.uid] ? 700 : 400 }}>\n                      {c.reactions?.[currentUser.uid] && c.reactions[currentUser.uid] !== '❤️' ? c.reactions[currentUser.uid] + ' ' : ''}J'aime",
  "Commentaire J'aime → ❤️"
);

// 1c. Modal arrière-plan — insérer avant le return principal
let prof = read('src/pages/Profile.jsx');
if (prof) {
  if (prof.includes('selectedPost && (')) {
    skip('Modal arrière-plan déjà présent');
  } else if (prof.includes('  return (\n    <div>')) {
    const MODAL = `  return (
    <>
      {selectedPost && (
        <div onClick={() => setSelectedPost(null)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.88)',
          zIndex:500, overflowY:'auto', display:'flex',
          alignItems:'flex-start', justifyContent:'center', padding:'16px 0 60px'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'white', borderRadius:16, width:'100%',
            maxWidth:520, margin:'0 12px', overflow:'hidden'
          }}>
            <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
              <img
                src={profile.photoURL||\`https://ui-avatars.com/api/?name=\${encodeURIComponent(profile.fullName||'U')}&background=1877F2&color=fff\`}
                alt="" style={{ width:42,height:42,borderRadius:'50%',objectFit:'cover' }}/>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700,fontSize:14 }}>{profile.fullName}</p>
                <p style={{ fontSize:12,color:'#65676B' }}>{timeAgo(selectedPost.createdAt)}</p>
              </div>
              <button onClick={() => setSelectedPost(null)} style={{
                background:'#F0F2F5',border:'none',borderRadius:'50%',
                width:34,height:34,cursor:'pointer',fontSize:20,
                display:'flex',alignItems:'center',justifyContent:'center'
              }}>✕</button>
            </div>
            {selectedPost.content && (
              selectedPost.textBg
                ? <div style={{ background:selectedPost.textBg,minHeight:160,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 20px' }}>
                    <p style={{ fontSize:22,fontWeight:800,color:'white',textAlign:'center' }}>{selectedPost.content}</p>
                  </div>
                : <p style={{ padding:'0 16px 10px',fontSize:15,lineHeight:1.6,wordBreak:'break-word' }}>{selectedPost.content}</p>
            )}
            {selectedPost.mediaURL && (
              selectedPost.mediaType==='image'
                ? <img src={selectedPost.mediaURL} alt="" style={{ width:'100%',maxHeight:420,objectFit:'contain',background:'#000',display:'block' }}/>
                : <video src={selectedPost.mediaURL} controls style={{ width:'100%',maxHeight:420,background:'#000',display:'block' }}/>
            )}
            {(Object.keys(selectedPost.reactions||{}).length > 0 || (selectedPost.comments||[]).length > 0) && (
              <div style={{ padding:'8px 16px',display:'flex',justifyContent:'space-between',borderTop:'1px solid #F0F2F5' }}>
                <span style={{ fontSize:13,color:'#65676B' }}>{Object.keys(selectedPost.reactions||{}).length} réaction{Object.keys(selectedPost.reactions||{}).length!==1?'s':''}</span>
                <span style={{ fontSize:13,color:'#65676B' }}>{(selectedPost.comments||[]).length} commentaire{(selectedPost.comments||[]).length!==1?'s':''}</span>
              </div>
            )}
            <div className="post-actions-row">
              <button onClick={() => reactToPost(selectedPost.id, selectedPost.reactions?.[currentUser.uid] || '❤️')}
                className={'post-action-btn'+(selectedPost.reactions?.[currentUser.uid]?' active':'')}>
                <NeonLike size={19} color={selectedPost.reactions?.[currentUser.uid]?'#FF2D8D':'#65676B'}/> J'aime
              </button>
              <button onClick={() => navigate(\`/post/\${selectedPost.id}\`)} className="post-action-btn">
                <NeonComment size={18}/> Commenter
              </button>
              <button onClick={() => sharePost(selectedPost)} className="post-action-btn">
                <NeonShare size={18}/> Partager
              </button>
            </div>
          </div>
        </div>
      )}
      <div>`;

    prof = prof.replace('  return (\n    <div>', MODAL);
    // Fix closing tag
    const lastClose = '    </div>\n  );\n}';
    const idx = prof.lastIndexOf(lastClose);
    if (idx !== -1) {
      prof = prof.slice(0, idx) + '    </div>\n    </>\n  );\n}';
    }
    write('src/pages/Profile.jsx', prof);
    good('Modal arrière-plan ajouté');
  } else {
    skip('Structure return différente — modal non appliqué');
  }
}

// ══════════════════════════════════
// 【2】 SHOPDETAIL.jsx — Stats plein écran + SVG + charts
// ══════════════════════════════════
console.log('\n【2】 ShopDetail.jsx — Stats plein écran + NeonIcons + charts...');

// 2a. Ajouter NeonPeople, NeonLike, NeonComment aux imports
rep('src/pages/ShopDetail.jsx',
  "import { NeonPhone, NeonLocation, NeonPlaneWhite, NeonChart, NeonEye } from '../components/NeonIcons';",
  "import { NeonPhone, NeonLocation, NeonPlaneWhite, NeonChart, NeonEye, NeonPeople, NeonLike, NeonComment } from '../components/NeonIcons';",
  'ShopDetail NeonIcons imports'
);

// 2b. Remplacer toute la stats modal par version plein écran + charts
const SHOP_OLD_STATS = `      {/* ── Statistiques (admin) : mifanaraka amin'ny boutique ── */}
      {statsOpen && (() => {
        let reactions = 0, views = 0, clicks = 0, comments = 0;
        items.forEach(it => { reactions += Object.keys(it.reactions||{}).length; views += it.views || 0; clicks += it.clicks || 0; comments += (it.comments||[]).length; });
        const Row = ({ icon, label, value, c }) => (
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 4px', borderBottom:'1px solid #F0F2F5' }}>
            <span style={{ width:38, height:38, borderRadius:11, background:c, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</span>
            <span style={{ flex:1, fontSize:13.5, color:'#65676B' }}>{label}</span>
            <span style={{ fontWeight:800, fontSize:17 }}>{Number(value).toLocaleString()}</span>
          </div>
        );
        return (
          <div onClick={() => setStatsOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
            <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:520, maxHeight:'80vh', overflowY:'auto', padding:'14px 16px 26px' }}>
              <div style={{ width:40, height:4, borderRadius:2, background:'#CED0D4', margin:'0 auto 12px' }} />
              <h3 style={{ fontWeight:800, fontSize:16, display:'flex', alignItems:'center', gap:8, marginBottom:6 }}><NeonChart size={18}/> Statistiques — {shop.name}</h3>
              <p style={{ fontSize:11.5, color:'#65676B', marginBottom:8 }}>Boutique : abonnés, articles et interactions</p>
              <Row icon={<span style={{ color:'#fff', fontSize:16 }}>👥</span>} label="Abonnés" value={(shop.followers||[]).length} c="linear-gradient(145deg,#63A9FF,#1877F2)" />
              <Row icon={<span style={{ color:'#fff', fontSize:15 }}>🛍️</span>} label="Articles publiés" value={items.length} c="linear-gradient(145deg,#FF6FA5,#FF2D8D)" />
              <Row icon={<span style={{ color:'#fff', fontSize:15 }}>❤</span>} label="Réactions reçues" value={reactions} c="linear-gradient(145deg,#FF9A5A,#FF7A00)" />
              <Row icon={<NeonEye size={16} color="#fff"/>} label="Vues des articles" value={views} c="linear-gradient(145deg,#8F7BFF,#5E4BDB)" />
              <Row icon={<span style={{ color:'#fff', fontSize:15 }}>👆</span>} label="Clics sur les articles" value={clicks} c="linear-gradient(145deg,#FFD84D,#F2B300)" />
              <Row icon={<span style={{ color:'#fff', fontSize:15 }}>💬</span>} label="Commentaires" value={comments} c="linear-gradient(145deg,#3DD9C4,#12A48D)" />
            </div>
          </div>
        );
      })()}`;

const SHOP_NEW_STATS = `      {/* ── Statistiques plein écran : SVG NeonIcons + donut + bar chart ── */}
      {statsOpen && (() => {
        let reactions = 0, views = 0, clicks = 0, comments = 0;
        items.forEach(it => { reactions += Object.keys(it.reactions||{}).length; views += it.views||0; clicks += it.clicks||0; comments += (it.comments||[]).length; });
        const abonnes = (shop.followers||[]).length;
        const statsData = [
          { label:'Abonnés',   value:abonnes,    color:'#1877F2', icon:<NeonPeople  size={18} color="#fff"/> },
          { label:'Articles',  value:items.length,color:'#FF2D8D',icon:<NeonChart   size={18} color="#fff"/> },
          { label:'Réactions', value:reactions,  color:'#FF7A00', icon:<NeonLike    size={18} color="#fff"/> },
          { label:'Vues',      value:views,      color:'#5E4BDB', icon:<NeonEye     size={18} color="#fff"/> },
          { label:'Clics',     value:clicks,     color:'#F2B300', icon:<NeonChart   size={16} color="#fff"/> },
          { label:'Comments',  value:comments,   color:'#12A48D', icon:<NeonComment size={18} color="#fff"/> },
        ];
        const total = statsData.reduce((s,d)=>s+d.value,0)||1;
        const maxV  = Math.max(...statsData.map(d=>d.value),1);
        // Donut SVG
        let cumPct = 0;
        const R=48, CX=60, CY=60, CIRC=2*Math.PI*R;
        const donutSegs = statsData.filter(d=>d.value>0).map((d,i)=>{
          const pct = d.value/total;
          const dash= pct*CIRC;
          const off = -cumPct*CIRC + CIRC/4;
          cumPct += pct;
          return <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={d.color} strokeWidth={20}
            strokeDasharray={dash + " " + (CIRC-dash)} strokeDashoffset={off}
            style={{ transition:'stroke-dasharray .4s' }}/>;
        });
        return (
          <div onClick={() => setStatsOpen(false)} style={{ position:'fixed', inset:0, background:'white', zIndex:400, overflowY:'auto', display:'flex', flexDirection:'column' }}>
            {/* Header */}
            <div style={{ position:'sticky', top:0, background:'white', zIndex:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid #E4E6EB', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}
              onClick={e=>e.stopPropagation()}>
              <button onClick={() => setStatsOpen(false)} style={{ background:'#F0F2F5', border:'none', borderRadius:'50%', width:36, height:36, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>←</button>
              <NeonChart size={20}/>
              <div>
                <p style={{ fontWeight:800, fontSize:16 }}>Statistiques — {shop.name}</p>
                <p style={{ fontSize:11, color:'#65676B' }}>Boutique · abonnés, articles, interactions</p>
              </div>
            </div>
            <div onClick={e=>e.stopPropagation()} style={{ padding:'16px 14px 40px', maxWidth:520, margin:'0 auto', width:'100%' }}>
              {/* Donut chart */}
              <div style={{ background:'#F8F9FA', borderRadius:16, padding:'16px', marginBottom:14, display:'flex', alignItems:'center', gap:16 }}>
                <svg width={120} height={120} viewBox="0 0 120 120" style={{ flexShrink:0 }}>
                  <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F0F2F5" strokeWidth={20}/>
                  {donutSegs}
                  <text x={CX} y={CY-5} textAnchor="middle" fontSize={11} fill="#65676B">Total</text>
                  <text x={CX} y={CY+10} textAnchor="middle" fontSize={16} fontWeight={800} fill="#050505">{total}</text>
                </svg>
                <div style={{ flex:1 }}>
                  {statsData.filter(d=>d.value>0).map((d,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:d.color, flexShrink:0 }}/>
                      <span style={{ fontSize:12, color:'#65676B', flex:1 }}>{d.label}</span>
                      <span style={{ fontSize:12, fontWeight:700 }}>{d.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Bar chart */}
              <div style={{ background:'#F8F9FA', borderRadius:16, padding:'14px', marginBottom:14 }}>
                <p style={{ fontWeight:700, fontSize:13, marginBottom:10, color:'#050505' }}>Distribution</p>
                <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:80 }}>
                  {statsData.map((d,i)=>{
                    const h = Math.max((d.value/maxV)*64,2);
                    return (
                      <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                        <span style={{ fontSize:9, fontWeight:700, color:d.color }}>{d.value}</span>
                        <div style={{ width:'100%', height:h, background:d.color, borderRadius:'6px 6px 2px 2px', opacity:0.85 }}/>
                        <span style={{ fontSize:8, color:'#65676B', textAlign:'center', lineHeight:1.2 }}>{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Cards clicables */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {statsData.map((d,i)=>(
                  <div key={i} style={{ background:'white', borderRadius:14, padding:'12px', border:'1px solid #E4E6EB', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ width:40, height:40, borderRadius:12, background:\`linear-gradient(145deg,\${d.color}99,\${d.color})\`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{d.icon}</span>
                    <div>
                      <p style={{ fontWeight:800, fontSize:20, lineHeight:1 }}>{d.value.toLocaleString()}</p>
                      <p style={{ fontSize:11, color:'#65676B', marginTop:2 }}>{d.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}`;

rep('src/pages/ShopDetail.jsx', SHOP_OLD_STATS, SHOP_NEW_STATS, 'ShopDetail stats plein écran + charts');

// ══════════════════════════════════
// 【3】 ARTISTDETAIL.jsx — Stats plein écran + SVG + charts
// ══════════════════════════════════
console.log('\n【3】 ArtistDetail.jsx — Stats plein écran + NeonIcons + charts...');

// 3a. Ajouter NeonPeople, NeonLike, NeonComment
rep('src/pages/ArtistDetail.jsx',
  "import { NeonMic, NeonGlobe, NeonPhone, NeonLocation, NeonChart, NeonEye } from '../components/NeonIcons';",
  "import { NeonMic, NeonGlobe, NeonPhone, NeonLocation, NeonChart, NeonEye, NeonPeople, NeonLike, NeonComment } from '../components/NeonIcons';",
  'ArtistDetail NeonIcons imports'
);

// 3b. Remplacer stats modal
const ARTIST_OLD_STATS = `      {/* ── Statistiques (admin) : mifanaraka amin'ny page artiste ── */}
      {statsOpen && (() => {
        let reactions = 0, views = 0, comments = 0;
        tracks.forEach(t => { reactions += Object.keys(t.reactions||{}).length; views += t.views || 0; comments += (t.comments||[]).length; });
        const Row = ({ icon, label, value, c }) => (
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 4px', borderBottom:'1px solid #F0F2F5' }}>
            <span style={{ width:38, height:38, borderRadius:11, background:c, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</span>
            <span style={{ flex:1, fontSize:13.5, color:'#65676B' }}>{label}</span>
            <span style={{ fontWeight:800, fontSize:17 }}>{Number(value).toLocaleString()}</span>
          </div>
        );
        return (
          <div onClick={() => setStatsOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
            <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:520, maxHeight:'80vh', overflowY:'auto', padding:'14px 16px 26px' }}>
              <div style={{ width:40, height:4, borderRadius:2, background:'#CED0D4', margin:'0 auto 12px' }} />
              <h3 style={{ fontWeight:800, fontSize:16, display:'flex', alignItems:'center', gap:8, marginBottom:6 }}><NeonChart size={18}/> Statistiques — {artist.name}</h3>
              <p style={{ fontSize:11.5, color:'#65676B', marginBottom:8 }}>Canal artiste : abonnés, titres et interactions</p>
              <Row icon={<span style={{ color:'#fff', fontSize:16 }}>👥</span>} label="Abonnés" value={(artist.followers||[]).length} c="linear-gradient(145deg,#63A9FF,#1877F2)" />
              <Row icon={<NeonMic size={16} color="#fff"/>} label="Titres / publications" value={tracks.length} c="linear-gradient(145deg,#FF6FA5,#FF2D8D)" />
              <Row icon={<span style={{ color:'#fff', fontSize:15 }}>❤</span>} label="Réactions reçues" value={reactions} c="linear-gradient(145deg,#FF9A5A,#FF7A00)" />
              <Row icon={<NeonEye size={16} color="#fff"/>} label="Vues / écoutes" value={views} c="linear-gradient(145deg,#8F7BFF,#5E4BDB)" />
              <Row icon={<span style={{ color:'#fff', fontSize:15 }}>💬</span>} label="Commentaires" value={comments} c="linear-gradient(145deg,#3DD9C4,#12A48D)" />
            </div>
          </div>
        );
      })()}`;

const ARTIST_NEW_STATS = `      {/* ── Statistiques plein écran artiste : SVG NeonIcons + donut + bar ── */}
      {statsOpen && (() => {
        let reactions = 0, views = 0, comments = 0;
        tracks.forEach(t => { reactions += Object.keys(t.reactions||{}).length; views += t.views||0; comments += (t.comments||[]).length; });
        const abonnes = (artist.followers||[]).length;
        const statsData = [
          { label:'Abonnés',   value:abonnes,      color:'#1877F2', icon:<NeonPeople  size={18} color="#fff"/> },
          { label:'Titres',    value:tracks.length, color:'#FF2D8D', icon:<NeonMic     size={18} color="#fff"/> },
          { label:'Réactions', value:reactions,     color:'#FF7A00', icon:<NeonLike    size={18} color="#fff"/> },
          { label:'Écoutes',   value:views,         color:'#5E4BDB', icon:<NeonEye     size={18} color="#fff"/> },
          { label:'Comments',  value:comments,      color:'#12A48D', icon:<NeonComment size={18} color="#fff"/> },
        ];
        const total = statsData.reduce((s,d)=>s+d.value,0)||1;
        const maxV  = Math.max(...statsData.map(d=>d.value),1);
        let cumPct = 0;
        const R=48, CX=60, CY=60, CIRC=2*Math.PI*R;
        const donutSegs = statsData.filter(d=>d.value>0).map((d,i)=>{
          const pct = d.value/total;
          const dash= pct*CIRC;
          const off = -cumPct*CIRC + CIRC/4;
          cumPct += pct;
          return <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={d.color} strokeWidth={20}
            strokeDasharray={dash + " " + (CIRC-dash)} strokeDashoffset={off}
            style={{ transition:'stroke-dasharray .4s' }}/>;
        });
        return (
          <div onClick={() => setStatsOpen(false)} style={{ position:'fixed', inset:0, background:'white', zIndex:400, overflowY:'auto', display:'flex', flexDirection:'column' }}>
            <div style={{ position:'sticky', top:0, background:'white', zIndex:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid #E4E6EB', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}
              onClick={e=>e.stopPropagation()}>
              <button onClick={() => setStatsOpen(false)} style={{ background:'#F0F2F5', border:'none', borderRadius:'50%', width:36, height:36, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>←</button>
              <NeonChart size={20}/>
              <div>
                <p style={{ fontWeight:800, fontSize:16 }}>Statistiques — {artist.name}</p>
                <p style={{ fontSize:11, color:'#65676B' }}>Canal artiste · abonnés, titres, interactions</p>
              </div>
            </div>
            <div onClick={e=>e.stopPropagation()} style={{ padding:'16px 14px 40px', maxWidth:520, margin:'0 auto', width:'100%' }}>
              <div style={{ background:'#F8F9FA', borderRadius:16, padding:'16px', marginBottom:14, display:'flex', alignItems:'center', gap:16 }}>
                <svg width={120} height={120} viewBox="0 0 120 120" style={{ flexShrink:0 }}>
                  <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F0F2F5" strokeWidth={20}/>
                  {donutSegs}
                  <text x={CX} y={CY-5} textAnchor="middle" fontSize={11} fill="#65676B">Total</text>
                  <text x={CX} y={CY+10} textAnchor="middle" fontSize={16} fontWeight={800} fill="#050505">{total}</text>
                </svg>
                <div style={{ flex:1 }}>
                  {statsData.filter(d=>d.value>0).map((d,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:d.color, flexShrink:0 }}/>
                      <span style={{ fontSize:12, color:'#65676B', flex:1 }}>{d.label}</span>
                      <span style={{ fontSize:12, fontWeight:700 }}>{d.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:'#F8F9FA', borderRadius:16, padding:'14px', marginBottom:14 }}>
                <p style={{ fontWeight:700, fontSize:13, marginBottom:10, color:'#050505' }}>Distribution</p>
                <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:80 }}>
                  {statsData.map((d,i)=>{
                    const h = Math.max((d.value/maxV)*64,2);
                    return (
                      <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                        <span style={{ fontSize:9, fontWeight:700, color:d.color }}>{d.value}</span>
                        <div style={{ width:'100%', height:h, background:d.color, borderRadius:'6px 6px 2px 2px', opacity:0.85 }}/>
                        <span style={{ fontSize:8, color:'#65676B', textAlign:'center', lineHeight:1.2 }}>{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {statsData.map((d,i)=>(
                  <div key={i} style={{ background:'white', borderRadius:14, padding:'12px', border:'1px solid #E4E6EB', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ width:40, height:40, borderRadius:12, background:\`linear-gradient(145deg,\${d.color}99,\${d.color})\`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{d.icon}</span>
                    <div>
                      <p style={{ fontWeight:800, fontSize:20, lineHeight:1 }}>{d.value.toLocaleString()}</p>
                      <p style={{ fontSize:11, color:'#65676B', marginTop:2 }}>{d.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}`;

rep('src/pages/ArtistDetail.jsx', ARTIST_OLD_STATS, ARTIST_NEW_STATS, 'ArtistDetail stats plein écran + charts');

// ══════════════════════════════════
// Résumé
// ══════════════════════════════════
console.log('\n═══════════════════════════════════════════════════');
console.log(`  Résultat: ${ok} ✅  ${warn} ⚠️   ${fail} ❌`);
console.log('═══════════════════════════════════════════════════');
if (fail === 0) console.log('\n🎉 Patch C-fixes terminé! npm run build\n');
else console.log('\n⚠️  Erreur(s). Envoie ce log.\n');
