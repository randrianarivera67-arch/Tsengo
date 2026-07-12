#!/usr/bin/env node
// patch-photos-fb.cjs — Grille photo FB (4 + N) + bouton télécharger (plein écran).
const fs=require('fs'); const path=require('path'); const ROOT=process.cwd();
let ok=0,fail=0;
const good=m=>{console.log('  \u2705 '+m);ok++;};
const skip=m=>{console.log('  \u26a0\ufe0f  '+m);};
const err=m=>{console.log('  \u274c '+m);fail++;};
const read=r=>{const p=path.join(ROOT,r);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):null;};
const write=(r,s)=>fs.writeFileSync(path.join(ROOT,r),s,'utf8');
function rep(r,from,to,l){const s=read(r);if(s==null){err('Introuvable: '+r);return;}if(s.includes(to)){good(l+' (déjà)');return;}if(!s.includes(from)){skip('Ancre manquante: '+l);return;}write(r,s.replace(from,to));good(l);}

console.log('\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
console.log('  PATCH — Photos façon Facebook');
console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n');

try { fs.writeFileSync(path.join(ROOT,'src/components/PhotoCarousel.jsx'), Buffer.from('Ly8gc3JjL2NvbXBvbmVudHMvUGhvdG9DYXJvdXNlbC5qc3gKLy8gR3JpbGxlIHBob3RvIGZhw6dvbiBGYWNlYm9vayA6IDEgw6AgNCB2aXNpYmxlcywgIitOIiBzdXIgbGEgNGUgc2kgcGx1cy4KLy8gQ2xpYyBzdXIgdW5lIGltYWdlID0+IG9uT3Blbih1cmwpIChvdXZyZSBsZSBwbGVpbiDDqWNyYW4vem9vbSBkdSBwYXJlbnQpLgpleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBQaG90b0Nhcm91c2VsKHsgdXJscyA9IFtdLCBvbk9wZW4gfSkgewogIGNvbnN0IGxpc3QgPSBBcnJheS5pc0FycmF5KHVybHMpID8gdXJscy5maWx0ZXIoQm9vbGVhbikgOiBbXTsKICBjb25zdCBuID0gbGlzdC5sZW5ndGg7CiAgaWYgKCFuKSByZXR1cm4gbnVsbDsKICBjb25zdCBvcGVuID0gKHUpID0+IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IG9uT3BlbiAmJiBvbk9wZW4odSk7IH07CiAgY29uc3QgR0FQID0gMjsKCiAgY29uc3QgQ2VsbCA9ICh7IHUsIHN0eWxlLCBiYWRnZSB9KSA9PiAoCiAgICA8ZGl2IG9uQ2xpY2s9e29wZW4odSl9IHN0eWxlPXt7IHBvc2l0aW9uOiAncmVsYXRpdmUnLCBvdmVyZmxvdzogJ2hpZGRlbicsIGN1cnNvcjogJ3BvaW50ZXInLCBiYWNrZ3JvdW5kOiAnIzExMScsIC4uLnN0eWxlIH19PgogICAgICA8aW1nIHNyYz17dX0gYWx0PSIiIGxvYWRpbmc9ImxhenkiIHN0eWxlPXt7IHdpZHRoOiAnMTAwJScsIGhlaWdodDogJzEwMCUnLCBvYmplY3RGaXQ6ICdjb3ZlcicsIGRpc3BsYXk6ICdibG9jaycgfX0gLz4KICAgICAge2JhZGdlICE9IG51bGwgJiYgKAogICAgICAgIDxkaXYgc3R5bGU9e3sgcG9zaXRpb246ICdhYnNvbHV0ZScsIGluc2V0OiAwLCBiYWNrZ3JvdW5kOiAncmdiYSgwLDAsMCwuNSknLCBkaXNwbGF5OiAnZmxleCcsIGFsaWduSXRlbXM6ICdjZW50ZXInLCBqdXN0aWZ5Q29udGVudDogJ2NlbnRlcicsIGNvbG9yOiAnI2ZmZicsIGZvbnRTaXplOiAzMCwgZm9udFdlaWdodDogODAwIH19Pit7YmFkZ2V9PC9kaXY+CiAgICAgICl9CiAgICA8L2Rpdj4KICApOwoKICBpZiAobiA9PT0gMSkgewogICAgcmV0dXJuICgKICAgICAgPGRpdiBvbkNsaWNrPXtvcGVuKGxpc3RbMF0pfSBzdHlsZT17eyBjdXJzb3I6ICdwb2ludGVyJyB9fT4KICAgICAgICA8aW1nIHNyYz17bGlzdFswXX0gYWx0PSIiIHN0eWxlPXt7IHdpZHRoOiAnMTAwJScsIG1heEhlaWdodDogNTIwLCBvYmplY3RGaXQ6ICdjb3ZlcicsIGRpc3BsYXk6ICdibG9jaycgfX0gLz4KICAgICAgPC9kaXY+CiAgICApOwogIH0KICBpZiAobiA9PT0gMikgewogICAgcmV0dXJuICgKICAgICAgPGRpdiBzdHlsZT17eyBkaXNwbGF5OiAnZ3JpZCcsIGdyaWRUZW1wbGF0ZUNvbHVtbnM6ICcxZnIgMWZyJywgZ2FwOiBHQVAsIGFzcGVjdFJhdGlvOiAnMiAvIDEnIH19PgogICAgICAgIDxDZWxsIHU9e2xpc3RbMF19IC8+PENlbGwgdT17bGlzdFsxXX0gLz4KICAgICAgPC9kaXY+CiAgICApOwogIH0KICBpZiAobiA9PT0gMykgewogICAgcmV0dXJuICgKICAgICAgPGRpdiBzdHlsZT17eyBkaXNwbGF5OiAnZ3JpZCcsIGdyaWRUZW1wbGF0ZUNvbHVtbnM6ICcxZnIgMWZyJywgZ3JpZFRlbXBsYXRlUm93czogJzFmciAxZnInLCBnYXA6IEdBUCwgYXNwZWN0UmF0aW86ICcxIC8gMScgfX0+CiAgICAgICAgPENlbGwgdT17bGlzdFswXX0gc3R5bGU9e3sgZ3JpZENvbHVtbjogJzEgLyBzcGFuIDInIH19IC8+CiAgICAgICAgPENlbGwgdT17bGlzdFsxXX0gLz48Q2VsbCB1PXtsaXN0WzJdfSAvPgogICAgICA8L2Rpdj4KICAgICk7CiAgfQogIC8vIG4gPj0gNAogIGNvbnN0IHNob3duID0gbGlzdC5zbGljZSgwLCA0KTsKICBjb25zdCByZXN0ID0gbiAtIDQ7CiAgcmV0dXJuICgKICAgIDxkaXYgc3R5bGU9e3sgZGlzcGxheTogJ2dyaWQnLCBncmlkVGVtcGxhdGVDb2x1bW5zOiAnMWZyIDFmcicsIGdyaWRUZW1wbGF0ZVJvd3M6ICcxZnIgMWZyJywgZ2FwOiBHQVAsIGFzcGVjdFJhdGlvOiAnMSAvIDEnIH19PgogICAgICB7c2hvd24ubWFwKCh1LCBpKSA9PiAoCiAgICAgICAgPENlbGwga2V5PXtpfSB1PXt1fSBiYWRnZT17aSA9PT0gMyAmJiByZXN0ID4gMCA/IHJlc3QgOiBudWxsfSAvPgogICAgICApKX0KICAgIDwvZGl2PgogICk7Cn0K','base64').toString('utf8'),'utf8'); good('PhotoCarousel.jsx (grille FB) mis à jour'); } catch(e){ err('PhotoCarousel: '+e.message); }

rep('src/pages/Home.jsx',
  '<PhotoCarousel urls={post.mediaURLs} />',
  '<PhotoCarousel urls={post.mediaURLs} onOpen={setZoomImg} />',
  'Grille -> lightbox (onOpen)');

rep('src/pages/Home.jsx',
  `<button onClick={()=>setZoomImg(null)} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,.15)', border:'none', borderRadius:'50%', width:40, height:40, color:'white', fontSize:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}>✕</button>`,
  `<button onClick={(e)=>{e.stopPropagation();downloadMedia(zoomImg,'image');}} aria-label="Télécharger" style={{ position:'absolute', top:16, left:16, background:'rgba(255,255,255,.15)', border:'none', borderRadius:'50%', width:40, height:40, color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          <button onClick={()=>setZoomImg(null)} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,.15)', border:'none', borderRadius:'50%', width:40, height:40, color:'white', fontSize:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}>✕</button>`,
  'Bouton télécharger (plein écran)');

console.log('\n  Résultat: '+ok+' \u2705   '+fail+' \u274c');
if(fail===0) console.log('\n\ud83c\udf89 npx vite build\n');
else console.log('\n\u26a0\ufe0f envoie ce log.\n');
