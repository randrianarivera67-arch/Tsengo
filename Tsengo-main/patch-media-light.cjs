// patch-media-light.cjs
// 1. Sary maivana kokoa amin'ny upload : 1080px/q0.8 → 720px/q0.62 (~60% kely kokoa)
// 2. loading="lazy" + decoding="async" amin'ny sary feed (alaina araka ny scroll ihany)
// 3. Jejo/Reels : rakitra 720p (fa tsy 1080p) + bitrate ahena (4-5 Mbps → 2.2-2.5 Mbps)
//    → video enregistré ~2x maivana, TSY misy re-encode (tsy misy bug duration/orientation)
// Idempotent + anchor unique guards.
const fs = require('fs');

function patchFile(path, edits) {
  let s = fs.readFileSync(path, 'utf8');
  let changed = 0;
  for (const [label, oldStr, newStr] of edits) {
    if (s.includes(newStr)) { console.log('  ⏭️  ' + label + ' — deja applique'); continue; }
    const n = s.split(oldStr).length - 1;
    if (n !== 1) { console.log('  ❌ ' + label + ' — ancre introuvable/multiple (' + n + ')'); process.exit(1); }
    s = s.replace(oldStr, newStr);
    changed++; console.log('  ✅ ' + label);
  }
  if (changed) fs.writeFileSync(path, s);
}

// ── 1) Sary maivana ──
console.log('src/utils/telegram.js');
patchFile('src/utils/telegram.js', [
  [
    'compressImage 720px / q0.62',
    'async function compressImage(file, maxWidth=1080, quality=0.8) {',
    'async function compressImage(file, maxWidth=720, quality=0.62) {',
  ],
]);

// ── 2) lazy loading amin ny sary feed ──
console.log('src/pages/Home.jsx');
patchFile('src/pages/Home.jsx', [
  [
    'img feed: loading=lazy + decoding=async',
    `post.mediaType==='image' ? <img src={post.mediaURL} alt="" onClick={e=>{e.stopPropagation();navigate(\`/post/\${post.id}\`);}} style={{ width:'100%', borderRadius:0, maxHeight:520, objectFit:'cover', display:'block', cursor:'zoom-in' }}/>`,
    `post.mediaType==='image' ? <img src={post.mediaURL} alt="" loading="lazy" decoding="async" onClick={e=>{e.stopPropagation();navigate(\`/post/\${post.id}\`);}} style={{ width:'100%', borderRadius:0, maxHeight:520, objectFit:'cover', display:'block', cursor:'zoom-in' }}/>`,
  ],
]);
console.log('src/components/PhotoCarousel.jsx');
patchFile('src/components/PhotoCarousel.jsx', [
  [
    'img tokana: loading=lazy',
    `<img src={list[0]} alt="" style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block' }} />`,
    `<img src={list[0]} alt="" loading="lazy" decoding="async" style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block' }} />`,
  ],
]);

// ── 3) Jejo 720p + bitrate ahena ──
console.log('src/components/JejoStudio.jsx');
patchFile('src/components/JejoStudio.jsx', [
  [
    'camera 720p (fa tsy 1080p)',
    'video: { facingMode: face, width: { ideal: portrait ? 1080 : 1920 }, height: { ideal: portrait ? 1920 : 1080 } },',
    'video: { facingMode: face, width: { ideal: portrait ? 720 : 1280 }, height: { ideal: portrait ? 1280 : 720 } },',
  ],
  [
    'bitrate effets 4M → 2.2M',
    'videoBitsPerSecond: 4_000_000',
    'videoBitsPerSecond: 2_200_000',
  ],
  [
    'bitrate rakitra 5M → 2.5M',
    'videoBitsPerSecond: 5_000_000',
    'videoBitsPerSecond: 2_500_000',
  ],
]);

console.log('✅ Media light : sary + Jejo maivana.');
