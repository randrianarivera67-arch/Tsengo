// patch-smartimage-msg.cjs  (FRONTEND — Messages.jsx)
// SmartImage (skeleton miaina + fade-in) amin'ny sary hafatra → tsy tapaka tsikelikely.
// Idempotent + anchor guards.
const fs = require('fs');
const path = 'src/pages/Messages.jsx';
let s = fs.readFileSync(path, 'utf8');
let changed = 0;

// import SmartImage
if (!s.includes("import SmartImage from")) {
  const anchor = "import { useState, useEffect, useRef } from 'react';";
  if (!s.includes(anchor)) { console.log('❌ import anchor introuvable'); process.exit(1); }
  s = s.replace(anchor, anchor + "\nimport SmartImage from '../components/SmartImage';");
  changed++; console.log('  ✅ import SmartImage');
} else console.log('  ⏭️  import SmartImage — deja applique');

// sary hafatra → SmartImage
const OLD = "{msg.mediaType === 'image' && <img src={msg.mediaURL} alt=\"\" onClick={()=>setZoomMedia({url:msg.mediaURL,type:'image'})} style={{ maxWidth: '100%', borderRadius: 8, display: 'block', cursor:'pointer' }} />}";
const NEW = "{msg.mediaType === 'image' && <SmartImage src={msg.mediaURL} onClick={()=>setZoomMedia({url:msg.mediaURL,type:'image'})} minH={140} style={{ maxWidth: '100%', width:'100%', borderRadius: 8, display: 'block', cursor:'pointer' }} />}";
if (s.includes(NEW)) console.log('  ⏭️  sary hafatra — deja applique');
else {
  const n = s.split(OLD).length - 1;
  if (n !== 1) { console.log('  ❌ sary hafatra — ancre introuvable/multiple (' + n + ')'); process.exit(1); }
  s = s.replace(OLD, NEW); changed++; console.log('  ✅ sary hafatra → SmartImage');
}

if (changed) fs.writeFileSync(path, s);
console.log('✅ SmartImage apetraka amin\'ny sary message.');
