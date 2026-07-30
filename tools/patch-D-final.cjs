#!/usr/bin/env node
// patch-D-final.cjs — TextBg FB style + Réactions labels + Zoom image

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
console.log('  PATCH D — TextBg + Réactions labels + Zoom img');
console.log('═══════════════════════════════════════════════════\n');

// [1] CSS placeholder blanc sur fond coloré
console.log('[1] index.css — placeholder blanc...');
rep('src/index.css',
  'input::placeholder, textarea::placeholder { color: #8A8D91 !important; font-size: 13px; }',
  'input::placeholder, textarea::placeholder { color: #8A8D91 !important; font-size: 13px; }\n.textbg-textarea::placeholder { color: rgba(255,255,255,0.65) !important; font-size: 22px; }',
  'Placeholder blanc textBg'
);

// [2] TextBg textarea full-width Facebook style
console.log('\n[2] Home.jsx — textBg full-width...');
rep('src/pages/Home.jsx',
  `            {textBg ? (
              <div style={{ background:textBg, borderRadius:12, minHeight:120, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px 12px' }}>
                <textarea className="input" placeholder="Quoi de neuf ?" value={content} onChange={e => setContent(e.target.value)}
                  style={{ resize:'none', width:'100%', border:'none', fontSize:20, fontWeight:700, color:'white', textAlign:'center', background:'transparent', outline:'none' }} maxLength={MAX_POST} autoFocus/>
              </div>
            ) : (
              <textarea className="input" placeholder={t('whatsOnMind')} value={content} onChange={e => setContent(e.target.value)} rows={3} style={{ resize:'none', width:'100%', border:'none', fontSize:17 }} maxLength={MAX_POST} autoFocus/>
            )}`,
  `            {textBg ? (
              <div style={{ background:textBg, borderRadius:14, minHeight:180, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 16px', width:'100%' }}>
                <textarea
                  className="textbg-textarea"
                  placeholder="Écrire quelque chose..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  style={{ resize:'none', width:'100%', border:'none', fontSize:22, fontWeight:800, color:'white', textAlign:'center', background:'transparent', outline:'none', lineHeight:1.4, minHeight:80 }}
                  maxLength={MAX_POST}
                  autoFocus
                />
              </div>
            ) : (
              <textarea className="input" placeholder={t('whatsOnMind')} value={content} onChange={e => setContent(e.target.value)} rows={3} style={{ resize:'none', width:'100%', border:'none', fontSize:17 }} maxLength={MAX_POST} autoFocus/>
            )}`,
  'TextBg textarea full-width'
);

rep('src/pages/Home.jsx',
  `          <div style={{ display:'flex', gap:6, marginTop:8, alignItems:'center' }}>
            <span style={{ fontSize:11, color:'#65676B' }}>Fond :</span>
            {TEXT_BG_COLORS.map((bg, i) => (
              <button key={i} onClick={() => setTextBg(bg)}
                style={{ width:22, height:22, borderRadius:'50%', padding:0, cursor:'pointer', flexShrink:0,
                  background: bg || '#ffffff',
                  border: textBg===bg ? '2.5px solid #050505' : '1.5px solid #E4E6EB' }}/>
            ))}
          </div>`,
  `          <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'center', justifyContent:'center', flexWrap:'wrap' }}>
            {TEXT_BG_COLORS.map((bg, i) => (
              <button key={i} onClick={() => setTextBg(bg)}
                style={{ width: textBg===bg ? 32 : 28, height: textBg===bg ? 32 : 28, borderRadius:'50%', padding:0, cursor:'pointer', flexShrink:0,
                  background: bg || '#ffffff',
                  border: textBg===bg ? '3px solid #050505' : '2px solid #E4E6EB',
                  transition:'all .15s',
                  boxShadow: textBg===bg ? '0 0 0 2px white, 0 0 0 4px #050505' : 'none' }}/>
            ))}
          </div>`,
  'Color picker centré + pastilles grandes'
);

// [3] FB_REACTIONS avec labels
console.log('\n[3] Home.jsx — FB_REACTIONS + picker...');
rep('src/pages/Home.jsx',
  "const REACTIONS   = ['❤️','😂','😮','😢','😡'];",
  `const REACTIONS   = ['❤️','😂','😮','😢','😡'];
const FB_REACTIONS = [
  { emoji:'❤️', label:"J'aime"    },
  { emoji:'😂', label:'Haha'      },
  { emoji:'😮', label:'Wouah'     },
  { emoji:'😢', label:'Triste'    },
  { emoji:'😡', label:'En colère' },
];`,
  'FB_REACTIONS Home'
);

rep('src/pages/Home.jsx',
  `                {showReact[post.id] && (
                  <div style={{ position:'absolute', bottom:'110%', left:8, background:'white', borderRadius:30, padding:'8px 12px', display:'flex', gap:6, boxShadow:'0 4px 20px rgba(0,0,0,.2)', zIndex:10, border:'1px solid #E4E6EB' }}>
                    {REACTIONS.map(e => <button key={e} onClick={() => reactToPost(post.id,e)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:24, transition:'transform .15s' }}
                      onMouseEnter={ev => ev.currentTarget.style.transform='scale(1.3)'} onMouseLeave={ev => ev.currentTarget.style.transform='scale(1)'}>{e}</button>)}
                  </div>
                )}`,
  `                {showReact[post.id] && (
                  <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', bottom:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)', background:'white', borderRadius:20, padding:'10px 8px 6px', display:'flex', gap:4, boxShadow:'0 4px 24px rgba(0,0,0,.18)', zIndex:50, border:'1px solid #E4E6EB', whiteSpace:'nowrap' }}>
                    {FB_REACTIONS.map(r => (
                      <button key={r.emoji}
                        onClick={() => { reactToPost(post.id, r.emoji); setShowReact(p=>({...p,[post.id]:false})); }}
                        style={{ background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'0 4px', minWidth:44 }}>
                        <span style={{ fontSize:28, lineHeight:1, transition:'transform .15s', display:'block' }}
                          onMouseEnter={ev=>ev.currentTarget.style.transform='scale(1.35) translateY(-4px)'}
                          onMouseLeave={ev=>ev.currentTarget.style.transform='scale(1)'}
                          onTouchStart={ev=>ev.currentTarget.style.transform='scale(1.35) translateY(-4px)'}
                          onTouchEnd={ev=>ev.currentTarget.style.transform='scale(1)'}
                        >{r.emoji}</span>
                        <span style={{ fontSize:10, color:'#65676B', fontWeight:600, fontFamily:'Poppins' }}>{r.label}</span>
                      </button>
                    ))}
                  </div>
                )}`,
  'Picker Facebook style Home'
);

// [4] zoomImg state + image clicable + overlay
console.log('\n[4] Home.jsx — zoom image...');
rep('src/pages/Home.jsx',
  '  const [expandedPosts, setExpandedPosts] = useState({});',
  '  const [expandedPosts, setExpandedPosts] = useState({});\n  const [zoomImg,       setZoomImg]       = useState(null);',
  'zoomImg state'
);

rep('src/pages/Home.jsx',
  `{post.isMusic ? <MusicPostCard post={post} height={140}/> : post.mediaType==='image' ? <img src={post.mediaURL} alt="" style={{ width:'100%', borderRadius:0, maxHeight:520, objectFit:'cover', display:'block' }}/>`,
  `{post.isMusic ? <MusicPostCard post={post} height={140}/> : post.mediaType==='image' ? <img src={post.mediaURL} alt="" onClick={e=>{e.stopPropagation();setZoomImg(post.mediaURL);}} style={{ width:'100%', borderRadius:0, maxHeight:520, objectFit:'cover', display:'block', cursor:'zoom-in' }}/>`,
  'Image → setZoomImg'
);

rep('src/pages/Home.jsx',
  '  return (\n    <div style={{ padding:0 }}>',
  `  return (
    <div style={{ padding:0 }}>
      {zoomImg && (
        <div onClick={()=>setZoomImg(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', touchAction:'none' }}>
          <button onClick={()=>setZoomImg(null)} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,.15)', border:'none', borderRadius:'50%', width:40, height:40, color:'white', fontSize:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}>✕</button>
          <img
            src={zoomImg} alt=""
            onClick={e=>e.stopPropagation()}
            onTouchStart={e=>{
              if(e.touches.length===2){
                e.currentTarget._sd=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
                e.currentTarget._ss=parseFloat(e.currentTarget.getAttribute('data-s')||1);
              } else {
                const now=Date.now();
                if(now-(e.currentTarget._lt||0)<300){
                  const c=parseFloat(e.currentTarget.getAttribute('data-s')||1);
                  const ns=c>1?1:2.5;
                  e.currentTarget.setAttribute('data-s',ns);
                  e.currentTarget.style.transform='scale('+ns+')';
                }
                e.currentTarget._lt=now;
              }
            }}
            onTouchMove={e=>{
              if(e.touches.length===2){
                e.preventDefault();
                const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
                const ns=Math.min(Math.max((e.currentTarget._ss||1)*(d/(e.currentTarget._sd||d)),1),4);
                e.currentTarget.setAttribute('data-s',ns);
                e.currentTarget.style.transform='scale('+ns+')';
              }
            }}
            style={{ maxWidth:'100vw', maxHeight:'100vh', objectFit:'contain', transition:'transform .2s', touchAction:'none', cursor:'zoom-in' }}
          />
        </div>
      )}`,
  'Zoom overlay + pinch + double-tap'
);

// [5] Profile — FB_REACTIONS + picker
console.log('\n[5] Profile.jsx — FB_REACTIONS + picker...');
rep('src/pages/Profile.jsx',
  "const REACTIONS = ['❤️','😂','😮','😢','😡'];",
  `const REACTIONS = ['❤️','😂','😮','😢','😡'];
const FB_REACTIONS = [
  { emoji:'❤️', label:"J'aime"    },
  { emoji:'😂', label:'Haha'      },
  { emoji:'😮', label:'Wouah'     },
  { emoji:'😢', label:'Triste'    },
  { emoji:'😡', label:'En colère' },
];`,
  'FB_REACTIONS Profile'
);

rep('src/pages/Profile.jsx',
  `            {showReact[post.id] && (
              <div style={{ position:'absolute', bottom:'110%', left:8, background:'white', borderRadius:30, padding:'8px 12px', display:'flex', gap:6, boxShadow:'0 4px 20px rgba(0,0,0,.2)', zIndex:10, border:'1px solid #E4E6EB' }}>
                {REACTIONS.map(e => <button key={e} onClick={() => reactToPost(post.id,e)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:24 }}>{e}</button>)}
              </div>
            )}`,
  `            {showReact[post.id] && (
              <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', bottom:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)', background:'white', borderRadius:20, padding:'10px 8px 6px', display:'flex', gap:4, boxShadow:'0 4px 24px rgba(0,0,0,.18)', zIndex:50, border:'1px solid #E4E6EB', whiteSpace:'nowrap' }}>
                {FB_REACTIONS.map(r => (
                  <button key={r.emoji}
                    onClick={()=>{ reactToPost(post.id, r.emoji); setShowReact(p=>({...p,[post.id]:false})); }}
                    style={{ background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'0 4px', minWidth:44 }}>
                    <span style={{ fontSize:28, lineHeight:1, display:'block', transition:'transform .15s' }}
                      onTouchStart={ev=>ev.currentTarget.style.transform='scale(1.35) translateY(-4px)'}
                      onTouchEnd={ev=>ev.currentTarget.style.transform='scale(1)'}
                    >{r.emoji}</span>
                    <span style={{ fontSize:10, color:'#65676B', fontWeight:600, fontFamily:'Poppins' }}>{r.label}</span>
                  </button>
                ))}
              </div>
            )}`,
  'Picker Facebook style Profile'
);

console.log('\n═══════════════════════════════════════════════════');
console.log('  Résultat: ' + ok + ' ✅  ' + warn + ' ⚠️   ' + fail + ' ❌');
console.log('═══════════════════════════════════════════════════');
if (fail === 0) console.log('\n🎉 Patch D terminé! npm run build\n');
else console.log('\n⚠️  Erreur(s). Envoie ce log.\n');

// ── Post-patch: supprimer les éventuels doublons ──
function cleanDuplicates(rel, constName) {
  let src = read(rel); if (!src) return;
  const regex = new RegExp('const ' + constName + ' = \\[[\\s\\S]*?\\];\\n', 'g');
  const matches = src.match(regex);
  if (matches && matches.length > 1) {
    // Garder seulement la première occurrence
    let first = true;
    src = src.replace(regex, m => { if (first) { first = false; return m; } return ''; });
    write(rel, src);
    good('Doublon ' + constName + ' supprimé dans ' + rel);
  }
}
function cleanDuplicateState(rel, stateName) {
  let src = read(rel); if (!src) return;
  const line = `  const [${stateName},`;
  const lines = src.split('\n');
  let seen = false;
  const cleaned = lines.filter(l => {
    if (l.includes(line)) { if (seen) return false; seen = true; }
    return true;
  }).join('\n');
  if (cleaned !== src) { write(rel, cleaned); good('Doublon state ' + stateName + ' supprimé'); }
}

console.log('\n[6] Nettoyage doublons...');
cleanDuplicates('src/pages/Home.jsx', 'FB_REACTIONS');
cleanDuplicates('src/pages/Profile.jsx', 'FB_REACTIONS');
cleanDuplicateState('src/pages/Home.jsx', 'zoomImg');
