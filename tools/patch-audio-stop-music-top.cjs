const fs = require('fs');
const done = [];

{
  const p = 'src/pages/Artists.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('arret de la lecture quand on quitte')) { done.push('Artists (deja)'); }
  else {
    const a = "  const audioRef = useRef(null);\n  const [playingId, setPlayingId] = useState(null);";
    if (s.split(a).length - 1 !== 1) { console.log('ERR ancre audio Artists ('+(s.split(a).length-1)+')'); process.exit(1); }
    s = s.replace(a, a + `
  // arret de la lecture quand on quitte la page
  useEffect(() => () => {
    const a = audioRef.current;
    if (a) { try { a.pause(); a.onended = null; a.src = ''; } catch {} }
  }, []);`);
    fs.writeFileSync(p, s);
    done.push('Artists');
  }
}

{
  const p = 'src/pages/Home.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('arret de la lecture quand on quitte')) { done.push('Home (deja)'); }
  else {
    const a = "  const musicAudioRef = useRef(null);\n  const [playingTrackId, setPlayingTrackId] = useState(null);";
    if (s.split(a).length - 1 !== 1) { console.log('ERR ancre audio Home ('+(s.split(a).length-1)+')'); process.exit(1); }
    s = s.replace(a, a + `
  // arret de la lecture quand on quitte la page
  useEffect(() => () => {
    const a = musicAudioRef.current;
    if (a) { try { a.pause(); a.onended = null; a.src = ''; } catch {} }
  }, []);`);
    fs.writeFileSync(p, s);
    done.push('Home');
  }
}

{
  const p = 'src/components/StoryStudio.jsx';
  let s = fs.readFileSync(p, 'utf8');
  const OLD = "        <div style={{ position: 'absolute', left: 14, bottom: mode === 'text' ? 14 : 54, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,.5)', borderRadius: 20, padding: '6px 12px', color: '#fff', fontSize: 12.5, fontWeight: 700, maxWidth: '70%' }}>";
  const NEW = "        <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 3, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', borderRadius: 20, padding: '6px 12px', color: '#fff', fontSize: 12.5, fontWeight: 700, maxWidth: '80%' }}>";
  if (s.includes("top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 3")) { done.push('StoryStudio (deja)'); }
  else {
    if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre badge musique ('+(s.split(OLD).length-1)+')'); process.exit(1); }
    s = s.replace(OLD, NEW);
    fs.writeFileSync(p, s);
    done.push('StoryStudio');
  }
}

console.log('OK : ' + done.join(', '));
