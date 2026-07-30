#!/usr/bin/env node
// patch-B-textbg-groups.cjs — Texte fond couleur (FB) dans les GROUPES + affichage
// des publications textBg (fil déjà fait, ici Groupe/Profil/PostDetail).
const fs=require('fs'); const path=require('path'); const ROOT=process.cwd();
let ok=0,fail=0;
const good=m=>{console.log('  \u2705 '+m);ok++;};
const skip=m=>{console.log('  \u26a0\ufe0f  '+m);};
const err=m=>{console.log('  \u274c '+m);fail++;};
const read=r=>{const p=path.join(ROOT,r);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):null;};
const write=(r,s)=>fs.writeFileSync(path.join(ROOT,r),s,'utf8');
function rep(r,from,to,l){const s=read(r);if(s==null){err('Introuvable: '+r+' ('+l+')');return;}if(s.includes(to)){good(l+' (déjà)');return;}if(!s.includes(from)){skip('Ancre manquante: '+l);return;}write(r,s.replace(from,to));good(l);}

console.log('\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
console.log('  PATCH — B : texte couleur (groupes + affichage)');
console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n');

rep("src/pages/GroupPage.jsx", `  const [content,    setContent]    = useState('');`, `  const [content,    setContent]    = useState('');
  const [textBg,     setTextBg]     = useState(null);`, "Groupe: state textBg");
rep("src/pages/GroupPage.jsx", `<textarea className="input" placeholder="Exprimez-vous..." value={content} onChange={e => setContent(e.target.value)} rows={3} style={{ resize:'none', flex:1, border:'none', fontSize:17 }} maxLength={2000} autoFocus/>`, `{textBg ? (
            <div style={{ flex:1, background:textBg, borderRadius:14, minHeight:160, display:'flex', alignItems:'center', justifyContent:'center', padding:'18px 14px' }}>
              <textarea placeholder="Écrire quelque chose..." value={content} onChange={e => setContent(e.target.value)} style={{ resize:'none', width:'100%', border:'none', background:'transparent', color:'#fff', fontWeight:800, fontSize:22, textAlign:'center', outline:'none', lineHeight:1.4, minHeight:80 }} maxLength={2000} autoFocus/>
            </div>
          ) : (
            <textarea className="input" placeholder="Exprimez-vous..." value={content} onChange={e => setContent(e.target.value)} rows={3} style={{ resize:'none', flex:1, border:'none', fontSize:17 }} maxLength={2000} autoFocus/>
          )}`, "Groupe: composer texte couleur");
rep("src/pages/GroupPage.jsx", `          {(gpLocation || gpMood || Object.values(gpTagSel).some(Boolean)) && (`, `          <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'center', justifyContent:'center', flexWrap:'wrap' }}>
            {[null,'linear-gradient(135deg,#1877F2,#42A5F5)','linear-gradient(135deg,#E91E8C,#FF6BB5)','linear-gradient(135deg,#FF7A00,#FFB347)','linear-gradient(135deg,#00C853,#69F0AE)','linear-gradient(135deg,#7C3AED,#A78BFA)'].map((bg,i)=>(
              <button key={i} onClick={()=>setTextBg(bg)} style={{ width:textBg===bg?32:28, height:textBg===bg?32:28, borderRadius:'50%', padding:0, cursor:'pointer', flexShrink:0, background:bg||'#ffffff', border:textBg===bg?'3px solid #050505':'2px solid #E4E6EB', transition:'all .15s' }}/>
            ))}
          </div>
          {(gpLocation || gpMood || Object.values(gpTagSel).some(Boolean)) && (`, "Groupe: sélecteur couleurs");
rep("src/pages/GroupPage.jsx", `      groupId: group.id, groupName: group.name, groupPhoto: group.photoURL || '',`, `      groupId: group.id, groupName: group.name, groupPhoto: group.photoURL || '',
      textBg: textBg || null,`, "Groupe: enregistrer textBg");
rep("src/pages/GroupPage.jsx", `      setContent(''); setMediaFile(null); setMediaPreview(null); setMediaType(''); setGpFullOpen(false); setGpLocation(''); setGpMood(''); setGpTagSel({});`, `      setTextBg(null); setContent(''); setMediaFile(null); setMediaPreview(null); setMediaType(''); setGpFullOpen(false); setGpLocation(''); setGpMood(''); setGpTagSel({});`, "Groupe: reset textBg");
rep("src/pages/GroupPage.jsx", `{post.content && <p style={{ fontSize: 15, lineHeight: 1.6, wordBreak: 'break-word' }}>{post.content}</p>}`, `{post.content && (post.textBg ? <p style={{ background: post.textBg, minHeight:180, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', color:'#fff', fontSize:24, fontWeight:800, padding:'24px 18px', lineHeight:1.4, wordBreak:'break-word', whiteSpace:'pre-wrap', margin:0, borderRadius:8 }}>{post.content}</p> : <p style={{ fontSize: 15, lineHeight: 1.6, wordBreak: 'break-word' }}>{post.content}</p>)}`, "Groupe: affichage textBg");
rep("src/pages/PostDetail.jsx", `{post.content&&<p style={{ fontSize:15, lineHeight:1.7, wordBreak:'break-word', marginBottom:10 }}>{post.content}</p>}`, `{post.content&&(post.textBg ? <p style={{ background: post.textBg, minHeight:180, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', color:'#fff', fontSize:24, fontWeight:800, padding:'24px 18px', lineHeight:1.4, wordBreak:'break-word', whiteSpace:'pre-wrap', margin:0, borderRadius:8 }}>{post.content}</p> : <p style={{ fontSize:15, lineHeight:1.7, wordBreak:'break-word', marginBottom:10 }}>{post.content}</p>)}`, "PostDetail: affichage textBg");
rep("src/pages/Profile.jsx", `          {post.content && (<>
            <p style={{ fontSize:15, lineHeight:1.6, wordBreak:'break-word',
              ...(expandedPosts[post.id] ? {} : { display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }) }}>
              {post.content}
            </p>`, `          {post.content && (<>
            {post.textBg ? (
            <p style={{ background: post.textBg, minHeight:180, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', color:'#fff', fontSize:24, fontWeight:800, padding:'24px 18px', lineHeight:1.4, wordBreak:'break-word', whiteSpace:'pre-wrap', margin:0, borderRadius:8 }}>{post.content}</p>
            ) : (
            <p style={{ fontSize:15, lineHeight:1.6, wordBreak:'break-word',
              ...(expandedPosts[post.id] ? {} : { display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }) }}>
              {post.content}
            </p>
            )}`, "Profil: affichage textBg");

console.log('\n  Résultat: '+ok+' \u2705   '+fail+' \u274c');
if(fail===0) console.log('\n\ud83c\udf89 npx vite build\n'); else console.log('\n\u26a0\ufe0f envoie ce log.\n');
