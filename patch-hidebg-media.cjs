#!/usr/bin/env node
// patch-hidebg-media.cjs — Cacher/désactiver le fond couleur texte quand une
// photo/vidéo est choisie (fil + groupe), et forcer textBg=aucune.
const fs=require('fs'); const path=require('path'); const ROOT=process.cwd();
let ok=0,fail=0;
const good=m=>{console.log('  \u2705 '+m);ok++;};
const skip=m=>{console.log('  \u26a0\ufe0f  '+m);};
const err=m=>{console.log('  \u274c '+m);fail++;};
const read=r=>{const p=path.join(ROOT,r);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):null;};
const write=(r,s)=>fs.writeFileSync(path.join(ROOT,r),s,'utf8');
function rep(r,from,to,l){const s=read(r);if(s==null){err('Introuvable: '+r);return;}if(s.includes(to)){good(l+' (déjà)');return;}if(!s.includes(from)){skip('Ancre manquante: '+l);return;}write(r,s.replace(from,to));good(l);}
console.log('\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
console.log('  PATCH — Cacher couleurs si photo/vidéo');
console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n');
rep("src/pages/Home.jsx", `    const files = Array.from(e.target.files || []);
    if (!files.length) return;`, `    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setTextBg(null);`, "Fil: média -> textBg aucune");
rep("src/pages/Home.jsx", `          <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'center', justifyContent:'center', flexWrap:'wrap' }}>
            {TEXT_BG_COLORS.map((bg, i) => (
              <button key={i} onClick={() => setTextBg(bg)}
                style={{ width: textBg===bg ? 32 : 28, height: textBg===bg ? 32 : 28, borderRadius:'50%', padding:0, cursor:'pointer', flexShrink:0,
                  background: bg || '#ffffff',
                  border: textBg===bg ? '3px solid #050505' : '2px solid #E4E6EB',
                  transition:'all .15s',
                  boxShadow: textBg===bg ? '0 0 0 2px white, 0 0 0 4px #050505' : 'none' }}/>
            ))}
          </div>`, `          {!mediaPreview && multiPhotos.length === 0 && (
          <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'center', justifyContent:'center', flexWrap:'wrap' }}>
            {TEXT_BG_COLORS.map((bg, i) => (
              <button key={i} onClick={() => setTextBg(bg)}
                style={{ width: textBg===bg ? 32 : 28, height: textBg===bg ? 32 : 28, borderRadius:'50%', padding:0, cursor:'pointer', flexShrink:0,
                  background: bg || '#ffffff',
                  border: textBg===bg ? '3px solid #050505' : '2px solid #E4E6EB',
                  transition:'all .15s',
                  boxShadow: textBg===bg ? '0 0 0 2px white, 0 0 0 4px #050505' : 'none' }}/>
            ))}
          </div>
          )}`, "Fil: cacher couleurs si média");
rep("src/pages/GroupPage.jsx", `    setMediaFile(file); setMediaType(type); setMediaPreview(URL.createObjectURL(file));`, `    setTextBg(null); setMediaFile(file); setMediaType(type); setMediaPreview(URL.createObjectURL(file));`, "Groupe: média -> textBg aucune");
rep("src/pages/GroupPage.jsx", `          <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'center', justifyContent:'center', flexWrap:'wrap' }}>
            {[null,'linear-gradient(135deg,#1877F2,#42A5F5)','linear-gradient(135deg,#E91E8C,#FF6BB5)','linear-gradient(135deg,#FF7A00,#FFB347)','linear-gradient(135deg,#00C853,#69F0AE)','linear-gradient(135deg,#7C3AED,#A78BFA)'].map((bg,i)=>(
              <button key={i} onClick={()=>setTextBg(bg)} style={{ width:textBg===bg?32:28, height:textBg===bg?32:28, borderRadius:'50%', padding:0, cursor:'pointer', flexShrink:0, background:bg||'#ffffff', border:textBg===bg?'3px solid #050505':'2px solid #E4E6EB', transition:'all .15s' }}/>
            ))}
          </div>`, `          {!mediaPreview && (
          <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'center', justifyContent:'center', flexWrap:'wrap' }}>
            {[null,'linear-gradient(135deg,#1877F2,#42A5F5)','linear-gradient(135deg,#E91E8C,#FF6BB5)','linear-gradient(135deg,#FF7A00,#FFB347)','linear-gradient(135deg,#00C853,#69F0AE)','linear-gradient(135deg,#7C3AED,#A78BFA)'].map((bg,i)=>(
              <button key={i} onClick={()=>setTextBg(bg)} style={{ width:textBg===bg?32:28, height:textBg===bg?32:28, borderRadius:'50%', padding:0, cursor:'pointer', flexShrink:0, background:bg||'#ffffff', border:textBg===bg?'3px solid #050505':'2px solid #E4E6EB', transition:'all .15s' }}/>
            ))}
          </div>
          )}`, "Groupe: cacher couleurs si média");
console.log('\n  Résultat: '+ok+' \u2705   '+fail+' \u274c');
if(fail===0) console.log('\n\ud83c\udf89 npx vite build\n'); else console.log('\n\u26a0\ufe0f envoie ce log.\n');
