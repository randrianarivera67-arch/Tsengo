const fs = require('fs');
const p = 'src/pages/Reels.jsx';
let s = fs.readFileSync(p, 'utf8');
const done = [];

if (!s.includes('subscribeUpload')) {
  const a = "import { uploadToTelegram } from '../utils/telegram';";
  if (s.split(a).length - 1 !== 1) { console.log('ERR ancre import ('+(s.split(a).length-1)+')'); process.exit(1); }
  s = s.replace(a, a + "\nimport { subscribeUpload } from '../utils/uploadManager';");
  done.push('import');
}

if (!s.includes('awaitNewRef')) {
  const a = "  const containerRef = useRef();";
  if (s.split(a).length - 1 !== 1) { console.log('ERR ancre containerRef ('+(s.split(a).length-1)+')'); process.exit(1); }
  s = s.replace(a, a + `

  // ── Envoi en arriere-plan : progression + retour sur MA video ──
  const [upState, setUpState] = useState({ status: 'idle', pct: 0, label: '' });
  const awaitNewRef = useRef(false);
  useEffect(() => subscribeUpload(st => {
    const v = st || { status: 'idle', pct: 0, label: '' };
    setUpState(v);
    if (v.status === 'uploading' || v.status === 'saving') awaitNewRef.current = true;
  }), []);
  useEffect(() => {
    if (!awaitNewRef.current || !posts.length) return;
    if (posts[0]?.uid !== currentUser?.uid) return;
    awaitNewRef.current = false;
    setActiveIndex(0);
    setTimeout(() => { try { if (containerRef.current) containerRef.current.scrollTop = 0; } catch {} }, 60);
  }, [posts, currentUser]);`);
  done.push('etat + retour auto');
}

if (!s.includes('jejo-upload-ring')) {
  const a = "      <div ref={containerRef} onScroll={handleScroll}";
  if (s.split(a).length - 1 !== 1) { console.log('ERR ancre conteneur ('+(s.split(a).length-1)+')'); process.exit(1); }
  s = s.replace(a, `      {/* Progression de l'envoi — style TikTok, navigation libre */}
      {(upState.status === 'uploading' || upState.status === 'saving') && (
        <div data-x="jejo-upload-ring" style={{
          position: 'absolute', top: 'calc(14px + env(safe-area-inset-top))', left: '50%',
          transform: 'translateX(-50%)', zIndex: 70,
          display: 'flex', alignItems: 'center', gap: 9,
          background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          borderRadius: 24, padding: '5px 14px 5px 5px', color: '#fff', fontSize: 12.5, fontWeight: 700,
          pointerEvents: 'none',
        }}>
          <svg width="30" height="30" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="4" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="#FF2D8D" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 15}
              strokeDashoffset={(2 * Math.PI * 15) * (1 - Math.min(100, Math.max(0, upState.pct || 0)) / 100)}
              style={{ transition: 'stroke-dashoffset .3s' }} />
          </svg>
          <span>{upState.status === 'saving' ? 'Finalisation…' : (Math.round(upState.pct || 0) + '%')}</span>
        </div>
      )}

${a}`);
  done.push('pastille circulaire');
}

fs.writeFileSync(p, s);
console.log('OK : ' + done.join(', '));
