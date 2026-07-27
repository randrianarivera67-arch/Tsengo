const fs = require('fs');
const p = 'src/components/PhotoCarousel.jsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('seenUrls')) { console.log('SKIP deja applique'); process.exit(0); }

const OLD = `function Img({ u }) {
  const ref = useRef(null);
  // Raha efa ao amin'ny cache ny sary (complete && naturalWidth>0) dia aseho AVY
  // HATRANY (tsy misy fondu) → tsy misy "flash mietsiketsika" amin'ny re-render.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const im = ref.current;
    if (im && im.complete && im.naturalWidth > 0) setLoaded(true);
  }, []);`;
if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre Img ('+(s.split(OLD).length-1)+')'); process.exit(1); }

s = s.replace(OLD, `// URLs deja affichees au moins une fois : permet de savoir DES LE PREMIER
// RENDU qu'une image n'a pas besoin de fondu (donc aucun clignotement).
const seenUrls = new Set();
function markSeen(u) {
  if (seenUrls.size > 800) seenUrls.clear();   // borne memoire
  seenUrls.add(u);
}

function Img({ u }) {
  const ref = useRef(null);
  // Etat initial SYNCHRONE : deja vue -> affichee pleine opacite tout de suite.
  const [loaded, setLoaded] = useState(() => seenUrls.has(u));
  useEffect(() => {
    setLoaded(seenUrls.has(u));                // si l'URL change
    const im = ref.current;
    if (im && im.complete && im.naturalWidth > 0) { markSeen(u); setLoaded(true); }
  }, [u]);`);

const OLD2 = `        onLoad={e => { const im = e.currentTarget; (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => setLoaded(true)); }}
        onError={() => setLoaded(true)}`;
if (s.split(OLD2).length - 1 !== 1) { console.log('ERR ancre onLoad ('+(s.split(OLD2).length-1)+')'); process.exit(1); }
s = s.replace(OLD2, `        onLoad={e => { const im = e.currentTarget; (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => { markSeen(u); setLoaded(true); }); }}
        onError={() => { markSeen(u); setLoaded(true); }}`);

fs.writeFileSync(p, s);
console.log('OK : plus de clignotement');
