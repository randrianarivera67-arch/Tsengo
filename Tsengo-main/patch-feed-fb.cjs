#!/usr/bin/env node
// patch-feed-fb.cjs — clic Commenter/compteur => page /post/:id (FB) + affichage
// des publications texte à fond couleur (textBg) dans le fil.
const fs=require('fs'); const path=require('path'); const ROOT=process.cwd();
let ok=0,fail=0;
const good=m=>{console.log('  \u2705 '+m);ok++;};
const skip=m=>{console.log('  \u26a0\ufe0f  '+m);};
const err=m=>{console.log('  \u274c '+m);fail++;};
const read=r=>{const p=path.join(ROOT,r);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):null;};
const write=(r,s)=>fs.writeFileSync(path.join(ROOT,r),s,'utf8');
function rep(r,from,to,l){const s=read(r);if(s==null){err('Introuvable: '+r);return;}if(s.includes(to)){good(l+' (déjà)');return;}if(!s.includes(from)){skip('Ancre manquante: '+l);return;}write(r,s.replace(from,to));good(l);}

console.log('\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
console.log('  PATCH — Fil (commentaires + texte couleur)');
console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n');

// 1) Commenter -> page /post/:id
rep('src/pages/Home.jsx',
  "<button onClick={() => setOpenCmt(p=>({...p,[post.id]:!p[post.id]}))} className='post-action-btn'>",
  "<button onClick={() => navigate('/post/' + post.id)} className='post-action-btn'>",
  'Commenter -> page publication');

// 2) compteur "N commentaires" -> page
rep('src/pages/Home.jsx',
  "<span onClick={() => setOpenCmt(p=>({...p,[post.id]:!p[post.id]}))} style={{ fontSize:12.5, color:'#65676B', cursor:'pointer' }}>",
  "<span onClick={(e) => { e.stopPropagation(); navigate('/post/' + post.id); }} style={{ fontSize:12.5, color:'#65676B', cursor:'pointer' }}>",
  'Compteur commentaires -> page');

// 3) Affichage texte fond couleur (textBg) dans le fil
rep('src/pages/Home.jsx',
  `style={{ fontSize:15, lineHeight:1.6, wordBreak:'break-word', whiteSpace:'pre-wrap', userSelect:'text', WebkitUserSelect:'text', cursor:'text',
                    ...(expandedPosts[post.id] ? {} : { display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }) }}`,
  `style={ post.textBg ? { background: post.textBg, minHeight:200, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', color:'#fff', fontSize:26, fontWeight:800, padding:'28px 20px', lineHeight:1.4, wordBreak:'break-word', whiteSpace:'pre-wrap', margin:0 } : { fontSize:15, lineHeight:1.6, wordBreak:'break-word', whiteSpace:'pre-wrap', userSelect:'text', WebkitUserSelect:'text', cursor:'text',
                    ...(expandedPosts[post.id] ? {} : { display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }) } }`,
  'Affichage texte fond couleur');

console.log('\n  Résultat: '+ok+' \u2705   '+fail+' \u274c');
if(fail===0) console.log('\n\ud83c\udf89 npx vite build\n'); else console.log('\n\u26a0\ufe0f envoie ce log.\n');
