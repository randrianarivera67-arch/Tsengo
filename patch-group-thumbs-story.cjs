// patch-group-thumbs-story.cjs
// 1. Video PARTAGÉE (Home + GroupPage) : thumbnail (poster) + autoplay + coordinateur
//    → composant iraisana vaovao src/components/FeedVideo.jsx
// 2. Enregistrements (Saved) : mampiseho ny thumbURL (fa tsy <video> manga/loko volombatolalaka)
// 3. Story : thumbnail amin'ny strip + poster amin'ny viewer + ny story video vaovao
//    dia mamorona thumbnail ho azy (Home addStory + StoryStudio)
// 4. Story video : FEO ORIGINAL no par défaut (tsy hira intsony), ary ny preview
//    ao StoryStudio mamoaka feo
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

// ── 0) Composant iraisana FeedVideo (kopian'ilay ao Home, miaraka amin'ny claim) ──
const FV = 'src/components/FeedVideo.jsx';
const fvCode = `// src/components/FeedVideo.jsx
// Video autoplay iraisana (fil, partages, groupes) : milalao rehefa hita ~60%,
// mijanona rehefa takona, ary mampijanona ny média hafa rehefa milalao (mediaBus).
import { useState, useEffect, useRef } from 'react';
import { claimPlayback } from '../utils/mediaBus';

export default function FeedVideo({ src, poster, dataSaver, style, onOpen }) {
  const vidRef = useRef(null);
  const wrapRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (dataSaver) { setPlaying(false); return; }
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          vidRef.current?.play?.().catch(() => {});
          setPlaying(true);
        } else {
          vidRef.current?.pause?.();
          setPlaying(false);
        }
      },
      { threshold: [0, 0.6, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [dataSaver]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', cursor: onOpen ? 'pointer' : 'default' }} onClick={() => { onOpen?.(); }}>
      <video
        ref={vidRef}
        src={src}
        onPlay={() => claimPlayback(() => { vidRef.current?.pause?.(); setPlaying(false); })}
        poster={poster || undefined}
        preload={(dataSaver || poster) ? 'none' : 'metadata'}
        style={style}
        muted={muted}
        loop
        playsInline
      />
      {!playing && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 50, height: 50, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: 20 }}>▶</span>
          </div>
        </div>
      )}
      {playing && (
        <button
          onClick={e => { e.stopPropagation(); setMuted(m => { const nx = !m; if (vidRef.current) { vidRef.current.muted = nx; if (!nx) vidRef.current.play?.().catch(() => {}); } return nx; }); }}
          style={{ position: 'absolute', bottom: 10, right: 10, width: 34, height: 34, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <span style={{ color: 'white', fontSize: 15 }}>{muted ? '🔇' : '🔊'}</span>
        </button>
      )}
    </div>
  );
}
`;
if (fs.existsSync(FV)) console.log('⏭️  FeedVideo.jsx efa misy');
else { fs.writeFileSync(FV, fvCode); console.log('✅ FeedVideo.jsx noforonina'); }

// ── 1) Home : video partagée → FeedVideo (poster + autoplay) ──
console.log('src/pages/Home.jsx');
patchFile('src/pages/Home.jsx', [
  [
    'sharedFrom video → FeedVideo + poster',
    ": <video src={post.sharedFrom.mediaURL} muted playsInline style={{ width:'100%', maxHeight:320, objectFit:'cover', display:'block', background:'#000' }}/>",
    ": <FeedVideo src={post.sharedFrom.mediaURL} poster={post.sharedFrom.thumbURL} dataSaver={dataSaver} style={{ width:'100%', maxHeight:320, objectFit:'cover', display:'block', background:'#000' }}/>",
  ],
  // (ny strip dia karakaraina manokana etsy ambany — miseho in-2 ilay anchor)
  [
    'story viewer : poster amin ny video',
    '<video ref={storyVideoRef} key={cur.id} src={cur.mediaURL} autoPlay={!dataSaver}',
    '<video ref={storyVideoRef} key={cur.id} src={cur.mediaURL} poster={cur.thumbURL || undefined} autoPlay={!dataSaver}',
  ],
  [
    'addStory : mamorona thumbnail ho an ny story video',
    "      const r = await uploadToTelegram(finalFile);\n      await addDoc(collection(db, 'stories'), {",
    "      const r = await uploadToTelegram(finalFile);\n      let storyThumbURL = '';\n      if (r.type === 'video') {\n        try {\n          const tf = await captureVideoThumb(finalFile);\n          if (tf) { const tr = await uploadToTelegram(tf); storyThumbURL = tr.url || ''; }\n        } catch {}\n      }\n      await addDoc(collection(db, 'stories'), {",
  ],
  [
    'addStory : thumbURL ao anaty doc',
    "        mediaURL: r.url,\n        mediaType: r.type === 'video' ? 'video' : 'image',",
    "        mediaURL: r.url,\n        thumbURL: storyThumbURL,\n        mediaType: r.type === 'video' ? 'video' : 'image',",
  ],
]);

// ── 1b) Story strip : thumbnail — ilay anchor miseho IN-2 (carte anao + cartes hafa),
//        samy soloina fanahy iniana izy roa ──
{
  const path = 'src/pages/Home.jsx';
  let s2 = fs.readFileSync(path, 'utf8');
  const OLD2 = '? <video src={last.mediaURL} muted playsInline preload="metadata" />';
  const NEW2 = '? (last.thumbURL ? <img src={last.thumbURL} alt="" /> : <video src={last.mediaURL} muted playsInline preload="metadata" />)';
  const c = s2.split(OLD2).length - 1;
  if (s2.includes(NEW2) && c === 0) console.log('  ⏭️  story strip thumbnails (x2) — deja applique');
  else if (c === 2) {
    s2 = s2.split(OLD2).join(NEW2);
    fs.writeFileSync(path, s2);
    console.log('  ✅ story strip thumbnails (2 toerana voaova)');
  } else { console.log('  ❌ story strip — isa tsy nampoizina (' + c + ', andrasana 2)'); process.exit(1); }
}

// ── 2) GroupPage : video partagée → FeedVideo ──
console.log('src/pages/GroupPage.jsx');
patchFile('src/pages/GroupPage.jsx', [
  [
    'import FeedVideo',
    "import ShareModal from '../components/ShareModal';",
    "import ShareModal from '../components/ShareModal';\nimport FeedVideo from '../components/FeedVideo';",
  ],
  [
    'sharedFrom video → FeedVideo + poster + autoplay',
    ": <video src={post.sharedFrom.mediaURL} muted playsInline style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block', background: '#000' }} />",
    ": <FeedVideo src={post.sharedFrom.mediaURL} poster={post.sharedFrom.thumbURL} dataSaver={dataSaver} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block', background: '#000' }} />",
  ],
]);

// ── 3) Saved (Enregistrements) : thumbnail marina ──
console.log('src/pages/Saved.jsx');
patchFile('src/pages/Saved.jsx', [
  [
    'video enregistree → thumbURL raha misy',
    '? <video src={p.mediaURL} muted playsInline preload="metadata" style={{ width: 64, height: 64, borderRadius: 10, objectFit: \'cover\', flexShrink: 0, background: \'#000\' }} />',
    '? (p.thumbURL ? <img src={p.thumbURL} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: \'cover\', flexShrink: 0 }} /> : <video src={p.mediaURL} muted playsInline preload="metadata" style={{ width: 64, height: 64, borderRadius: 10, objectFit: \'cover\', flexShrink: 0, background: \'#000\' }} />)',
  ],
]);

// ── 4) StoryStudio : feo ORIGINAL par défaut + thumbnail ──
console.log('src/components/StoryStudio.jsx');
patchFile('src/components/StoryStudio.jsx', [
  [
    'import captureVideoThumb',
    "import { trimVideoTo30s } from '../utils/trimVideo';",
    "import { trimVideoTo30s } from '../utils/trimVideo';\nimport { captureVideoThumb } from '../utils/videoThumb';",
  ],
  [
    'hira par defaut ho an ny PHOTO ihany (tsy ny video)',
    "      if (list.length && !music && (mode === 'photo' || mode === 'video')) setMusic(chooseDefaultTrack(list));",
    "      if (list.length && !music && mode === 'photo') setMusic(chooseDefaultTrack(list));",
  ],
  [
    'video : sonMode par defaut = original (feo an ny video)',
    "  const [sonMode, setSonMode]       = useState('music'); // 'music' (muet+musique) | 'original'",
    "  const [sonMode, setSonMode]       = useState('music'); // 'music' (muet+musique) | 'original'\n  // Vidéo : feo ORIGINAL no par défaut — tsy asiana hira raha tsy safidin'ny mpampiasa\n  useEffect(() => { if (mode === 'video') { setSonMode('original'); setMusic(null); } }, [mode]);",
  ],
  [
    'publish video : mamorona thumbnail',
    "        const r = await uploadToTelegram(f, p => setProgress(p));\n        await addDoc(collection(db, 'stories'), {\n          ...baseDoc(),\n          mediaType: 'video',\n          mediaURL: r.url,",
    "        const r = await uploadToTelegram(f, p => setProgress(p));\n        let _thumbURL = '';\n        try {\n          const tf = await captureVideoThumb(f);\n          if (tf) { const tr = await uploadToTelegram(tf); _thumbURL = tr.url || ''; }\n        } catch {}\n        await addDoc(collection(db, 'stories'), {\n          ...baseDoc(),\n          mediaType: 'video',\n          mediaURL: r.url,\n          thumbURL: _thumbURL,",
  ],
]);

console.log('✅ Vita : partages (thumb+autoplay), enregistrements, story (thumb + feo original).');
