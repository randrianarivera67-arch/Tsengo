const fs = require('fs');
function patchFile(path, edits) {
  let s = fs.readFileSync(path, 'utf8');
  let changed = 0;
  for (const [label, oldStr, newStr] of edits) {
    if (s.includes(newStr)) { console.log('  SKIP ' + label); continue; }
    const n = s.split(oldStr).length - 1;
    if (n !== 1) { console.log('  ERR ' + label + ' (' + n + ')'); process.exit(1); }
    s = s.replace(oldStr, newStr); changed++; console.log('  OK ' + label);
  }
  if (changed) fs.writeFileSync(path, s);
}
const FV = 'src/components/FeedVideo.jsx';
const fvCode = `import { useState, useEffect, useRef } from 'react';
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
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        vidRef.current?.play?.().catch(() => {}); setPlaying(true);
      } else { vidRef.current?.pause?.(); setPlaying(false); }
    }, { threshold: [0, 0.6, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, [dataSaver]);
  return (
    <div ref={wrapRef} style={{ position: 'relative', cursor: onOpen ? 'pointer' : 'default' }} onClick={() => { onOpen?.(); }}>
      <video ref={vidRef} src={src}
        onPlay={() => claimPlayback(() => { vidRef.current?.pause?.(); setPlaying(false); })}
        poster={poster || undefined} preload={(dataSaver || poster) ? 'none' : 'metadata'}
        style={style} muted={muted} loop playsInline />
      {!playing && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 50, height: 50, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: 20 }}>▶</span>
          </div>
        </div>
      )}
      {playing && (
        <button onClick={e => { e.stopPropagation(); setMuted(m => { const nx = !m; if (vidRef.current) { vidRef.current.muted = nx; if (!nx) vidRef.current.play?.().catch(() => {}); } return nx; }); }}
          style={{ position: 'absolute', bottom: 10, right: 10, width: 34, height: 34, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <span style={{ color: 'white', fontSize: 15 }}>{muted ? '🔇' : '🔊'}</span>
        </button>
      )}
    </div>
  );
}
`;
if (fs.existsSync(FV)) console.log('SKIP FeedVideo.jsx'); else { fs.writeFileSync(FV, fvCode); console.log('OK FeedVideo.jsx'); }
console.log('Home.jsx');
patchFile('src/pages/Home.jsx', [
  ['sharedFrom video FeedVideo',
   ": <video src={post.sharedFrom.mediaURL} muted playsInline style={{ width:'100%', maxHeight:320, objectFit:'cover', display:'block', background:'#000' }}/>",
   ": <FeedVideo src={post.sharedFrom.mediaURL} poster={post.sharedFrom.thumbURL} dataSaver={dataSaver} style={{ width:'100%', maxHeight:320, objectFit:'cover', display:'block', background:'#000' }}/>"],
  ['story viewer poster',
   '<video ref={storyVideoRef} key={cur.id} src={cur.mediaURL} autoPlay={!dataSaver}',
   '<video ref={storyVideoRef} key={cur.id} src={cur.mediaURL} poster={cur.thumbURL || undefined} autoPlay={!dataSaver}'],
  ['addStory thumb',
   "      const r = await uploadToTelegram(finalFile);\n      await addDoc(collection(db, 'stories'), {",
   "      const r = await uploadToTelegram(finalFile);\n      let storyThumbURL = '';\n      if (r.type === 'video') {\n        try {\n          const tf = await captureVideoThumb(finalFile);\n          if (tf) { const tr = await uploadToTelegram(tf); storyThumbURL = tr.url || ''; }\n        } catch {}\n      }\n      await addDoc(collection(db, 'stories'), {"],
  ['addStory thumbURL doc',
   "        mediaURL: r.url,\n        mediaType: r.type === 'video' ? 'video' : 'image',",
   "        mediaURL: r.url,\n        thumbURL: storyThumbURL,\n        mediaType: r.type === 'video' ? 'video' : 'image',"],
]);
{
  const path = 'src/pages/Home.jsx';
  let s2 = fs.readFileSync(path, 'utf8');
  const OLD2 = '? <video src={last.mediaURL} muted playsInline preload="metadata" />';
  const NEW2 = '? (last.thumbURL ? <img src={last.thumbURL} alt="" /> : <video src={last.mediaURL} muted playsInline preload="metadata" />)';
  const c = s2.split(OLD2).length - 1;
  if (s2.includes(NEW2) && c === 0) console.log('  SKIP strip x2');
  else if (c === 2) { s2 = s2.split(OLD2).join(NEW2); fs.writeFileSync(path, s2); console.log('  OK strip x2'); }
  else { console.log('  ERR strip (' + c + ')'); process.exit(1); }
}
console.log('GroupPage.jsx');
patchFile('src/pages/GroupPage.jsx', [
  ['import FeedVideo',
   "import ShareModal from '../components/ShareModal';",
   "import ShareModal from '../components/ShareModal';\nimport FeedVideo from '../components/FeedVideo';"],
  ['sharedFrom FeedVideo',
   ": <video src={post.sharedFrom.mediaURL} muted playsInline style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block', background: '#000' }} />",
   ": <FeedVideo src={post.sharedFrom.mediaURL} poster={post.sharedFrom.thumbURL} dataSaver={dataSaver} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block', background: '#000' }} />"],
]);
console.log('Saved.jsx');
patchFile('src/pages/Saved.jsx', [
  ['video thumb',
   '? <video src={p.mediaURL} muted playsInline preload="metadata" style={{ width: 64, height: 64, borderRadius: 10, objectFit: \'cover\', flexShrink: 0, background: \'#000\' }} />',
   '? (p.thumbURL ? <img src={p.thumbURL} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: \'cover\', flexShrink: 0 }} /> : <video src={p.mediaURL} muted playsInline preload="metadata" style={{ width: 64, height: 64, borderRadius: 10, objectFit: \'cover\', flexShrink: 0, background: \'#000\' }} />)'],
]);
console.log('StoryStudio.jsx');
patchFile('src/components/StoryStudio.jsx', [
  ['import captureVideoThumb',
   "import { trimVideoTo30s } from '../utils/trimVideo';",
   "import { trimVideoTo30s } from '../utils/trimVideo';\nimport { captureVideoThumb } from '../utils/videoThumb';"],
  ['hira photo ihany',
   "      if (list.length && !music && (mode === 'photo' || mode === 'video')) setMusic(chooseDefaultTrack(list));",
   "      if (list.length && !music && mode === 'photo') setMusic(chooseDefaultTrack(list));"],
  ['sonMode original video',
   "  const [sonMode, setSonMode]       = useState('music'); // 'music' (muet+musique) | 'original'",
   "  const [sonMode, setSonMode]       = useState('music'); // 'music' (muet+musique) | 'original'\n  useEffect(() => { if (mode === 'video') { setSonMode('original'); setMusic(null); } }, [mode]);"],
  ['publish video thumb',
   "        const r = await uploadToTelegram(f, p => setProgress(p));\n        await addDoc(collection(db, 'stories'), {\n          ...baseDoc(),\n          mediaType: 'video',\n          mediaURL: r.url,",
   "        const r = await uploadToTelegram(f, p => setProgress(p));\n        let _thumbURL = '';\n        try {\n          const tf = await captureVideoThumb(f);\n          if (tf) { const tr = await uploadToTelegram(tf); _thumbURL = tr.url || ''; }\n        } catch {}\n        await addDoc(collection(db, 'stories'), {\n          ...baseDoc(),\n          mediaType: 'video',\n          mediaURL: r.url,\n          thumbURL: _thumbURL,"],
]);
console.log('DONE');
