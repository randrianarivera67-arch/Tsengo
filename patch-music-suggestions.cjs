const fs = require('fs');
const done = [];

{
  const p = 'src/pages/Home.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('useMusicSuggestions')) { done.push('Home (deja)'); }
  else {
    const impA = "import { useViewerLocation } from '../hooks/useViewerLocation';";
    if (s.split(impA).length - 1 !== 1) { console.log('ERR ancre import Home'); process.exit(1); }
    s = s.replace(impA, impA + "\nimport { useMusicSuggestions } from '../hooks/useMusicSuggestions';");

    const stA = "  const [visibleCount, setVisibleCount] = useState(20);   // affichage progressif (20 au depart)";
    if (s.split(stA).length - 1 !== 1) { console.log('ERR ancre visibleCount'); process.exit(1); }
    s = s.replace(stA, stA + `

  const { items: musicItems, loadMore: loadMoreMusic } = useMusicSuggestions(10);
  const musicTracks = musicItems.filter(t => t.mediaType === 'audio' && t.mediaURL);
  useEffect(() => { if (visibleCount > 20) loadMoreMusic(); }, [visibleCount, loadMoreMusic]);
  function musicWindow(rowIndex) {
    const n = musicTracks.length;
    if (!n) return [];
    const start = (rowIndex * 10) % n;
    const win = musicTracks.slice(start, start + 10);
    return win.length >= 3 ? win : musicTracks.slice(0, 10);
  }`);

    const rdA = "              tracks={posts.filter(p => p.mediaType === 'audio' && p.isMusic)}";
    if (s.split(rdA).length - 1 !== 1) { console.log('ERR ancre tracks MusicRow'); process.exit(1); }
    s = s.replace(rdA, "              tracks={musicWindow(Math.floor(pIdx / 5))}");

    fs.writeFileSync(p, s);
    done.push('Home');
  }
}

{
  const p = 'src/pages/Artists.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('useMusicSuggestions')) { done.push('Artists (deja)'); }
  else {
    const impA = "import { db } from '../firebase';";
    if (s.split(impA).length - 1 !== 1) { console.log('ERR ancre import Artists ('+(s.split(impA).length-1)+')'); process.exit(1); }
    s = s.replace(impA, impA + "\nimport { useMusicSuggestions } from '../hooks/useMusicSuggestions';");

    const stA = "  const [media, setMedia] = useState([]);";
    if (s.split(stA).length - 1 !== 1) { console.log('ERR ancre state media'); process.exit(1); }
    s = s.replace(stA, "  const { items: media, hasMore: musicHasMore, loading: musicLoading, loadMore: loadMoreMusic } = useMusicSuggestions(10);");

    const efA = `  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(120)), snap => {
      setMedia(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.isMusic));
    }, err => console.error('Media:', err?.message || err));
    return () => unsub();
  }, []);

`;
    if (s.split(efA).length - 1 !== 1) { console.log('ERR ancre effet media ('+(s.split(efA).length-1)+')'); process.exit(1); }
    s = s.replace(efA, '');

    const btA = "      {/* Vidéos / Clips */}";
    if (s.split(btA).length - 1 !== 1) { console.log('ERR ancre section videos'); process.exit(1); }
    s = s.replace(btA, `      {musicHasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0 14px' }}>
          <button onClick={loadMoreMusic} disabled={musicLoading}
            style={{ background: '#FFFFFF', border: '1px solid #E4E6EB', borderRadius: 20, padding: '8px 18px', fontWeight: 700, fontSize: 13, color: '#FF2D8D', fontFamily: 'Poppins', cursor: musicLoading ? 'default' : 'pointer' }}>
            {musicLoading ? 'Chargement...' : 'Charger plus de musiques'}
          </button>
        </div>
      )}

${btA}`);

    fs.writeFileSync(p, s);
    done.push('Artists');
  }
}

console.log('OK : ' + done.join(', '));
