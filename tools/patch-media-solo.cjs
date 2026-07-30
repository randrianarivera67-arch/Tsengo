// patch-media-solo.cjs
// Tanjona (araka ny fangatahana) :
//   1. Média TOKANA ihany no mandeha indray mandeha (video na hira) :
//      manao play vaovao → mijanona HO AZY ny teo aloha.
//   2. Rehefa takona (scroll) ny hira MusicPostCard → mijanona ho azy.
//      (Ny FeedVideo efa mijanona rehefa takona — tsy kasihina.)
// Tsy manova ny autoplay. Idempotent + anchor unique guards.
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

// ── 0) src/utils/mediaBus.js (fichier vaovao kely) ──
const BUS = 'src/utils/mediaBus.js';
const busCode = `// src/utils/mediaBus.js
// Coordinateur média : mitahiry hoe IZA no mandeha izao.
// Rehefa misy manomboka (claim), dia ajanony ny teo aloha.
let currentPause = null;

export function claimPlayback(pauseFn) {
  if (currentPause && currentPause !== pauseFn) {
    try { currentPause(); } catch {}
  }
  currentPause = pauseFn;
}

export function releasePlayback(pauseFn) {
  if (currentPause === pauseFn) currentPause = null;
}
`;
if (fs.existsSync(BUS)) console.log('⏭️  mediaBus.js efa misy');
else { fs.writeFileSync(BUS, busCode); console.log('✅ mediaBus.js noforonina'); }

// ── 1) Home.jsx ──
console.log('src/pages/Home.jsx');
patchFile('src/pages/Home.jsx', [
  [
    'import claimPlayback',
    "import { SkeletonPost } from '../components/Skeleton';",
    "import { SkeletonPost } from '../components/Skeleton';\nimport { claimPlayback } from '../utils/mediaBus';",
  ],
  [
    'FeedVideo: claim rehefa milalao (manajanona ny hafa)',
    "      <video\n        ref={vidRef}\n        src={src}\n        poster={poster || undefined}",
    "      <video\n        ref={vidRef}\n        src={src}\n        onPlay={() => claimPlayback(() => { vidRef.current?.pause?.(); setPlaying(false); })}\n        poster={poster || undefined}",
  ],
  [
    'toggleMusic: claim alohan ny play',
    "    a.onended = () => setPlayingTrackId(null);\n    a.play().catch(() => {});",
    "    a.onended = () => setPlayingTrackId(null);\n    claimPlayback(() => { a.pause(); setPlayingTrackId(null); });\n    a.play().catch(() => {});",
  ],
]);

// ── 2) MusicPostCard.jsx ──
console.log('src/components/MusicPostCard.jsx');
patchFile('src/components/MusicPostCard.jsx', [
  [
    'import claimPlayback',
    "import { NeonMic } from './NeonIcons';",
    "import { NeonMic } from './NeonIcons';\nimport { claimPlayback } from '../utils/mediaBus';",
  ],
  [
    'cardRef + mijanona rehefa takona (scroll)',
    "  useEffect(() => () => { audioRef.current?.pause(); }, []);",
    "  useEffect(() => () => { audioRef.current?.pause(); }, []);\n\n  const cardRef = useRef(null);\n  useEffect(() => {\n    const el = cardRef.current;\n    if (!el) return;\n    const io = new IntersectionObserver(([e]) => {\n      if (!e.isIntersecting && audioRef.current && !audioRef.current.paused) {\n        audioRef.current.pause();\n        setPlaying(false);\n      }\n    }, { threshold: 0.05 });\n    io.observe(el);\n    return () => io.disconnect();\n  }, []);",
  ],
  [
    'toggle: claim alohan ny play',
    "    else { audioRef.current.play().catch(() => {}); setPlaying(true); }",
    "    else { claimPlayback(() => { audioRef.current?.pause(); setPlaying(false); }); audioRef.current.play().catch(() => {}); setPlaying(true); }",
  ],
  [
    'ref amin ny carte audio (ilaina amin ny IO)',
    "    <div style={{ borderRadius: 12, overflow: 'hidden', background: '#0c0c12' }}>",
    "    <div ref={cardRef} style={{ borderRadius: 12, overflow: 'hidden', background: '#0c0c12' }}>",
  ],
  [
    'video variant: claim rehefa milalao',
    "        <video src={post.mediaURL} poster={post.thumbURL} controls playsInline",
    "        <video src={post.mediaURL} poster={post.thumbURL} controls playsInline onPlay={e => { const v = e.currentTarget; claimPlayback(() => { try { v.pause(); } catch {} }); }}",
  ],
]);

console.log('✅ Media solo : coordinateur apetraka.');
