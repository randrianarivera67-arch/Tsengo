/* patch-tsengo-v11.cjs — Tsengo / Trengo
 * 1) Fil miovaova isaky ny refresh (Home + Groupe) — toy ny Facebook
 * 2) Thumbnail story vidéo tsy mainty intsony amin'ny APK
 * 3) Chargement voalohany 30 dia 20 isaky ny scroll (mitsitsy forfait)
 * 4) Retour avy amin'ny détails → miverina AMIN'NY publication nokitihina
 * Azo averina alefa (idempotent) : raha efa vita dia SKIP, tsy misy doublon.
 */
const fs = require('fs');

let FAIL = 0;
const log = (s) => console.log(s);
const has = (src, m) => src.indexOf(m) !== -1;

function rep(st, name, oldStr, newStr, marker) {
  if (has(st.src, marker)) { log('SKIP ' + name); return; }
  if (st.src.indexOf(oldStr) === -1) { log('ERR  ' + name + ' : tsy hita'); FAIL++; return; }
  st.src = st.src.replace(oldStr, newStr);
  log('OK   ' + name);
}

function repAll(st, name, oldStr, newStr) {
  const n = st.src.split(oldStr).length - 1;
  if (n === 0) { log('SKIP ' + name); return; }
  st.src = st.src.split(oldStr).join(newStr);
  log('OK   ' + name + ' (' + n + ')');
}

function repBlock(st, name, startMark, endMark, newBlock, marker) {
  if (has(st.src, marker)) { log('SKIP ' + name); return; }
  const i = st.src.indexOf(startMark);
  if (i === -1) { log('ERR  ' + name + ' : tsy hita ny fiandohana'); FAIL++; return; }
  const j = st.src.indexOf(endMark, i + startMark.length);
  if (j === -1) { log('ERR  ' + name + ' : tsy hita ny fiafarana'); FAIL++; return; }
  st.src = st.src.slice(0, i) + newBlock + st.src.slice(j + endMark.length);
  log('OK   ' + name);
}

function open(f) {
  if (!fs.existsSync(f)) { log('ERR  tsy hita ny fichier: ' + f); FAIL++; return null; }
  return { file: f, src: fs.readFileSync(f, 'utf8'), orig: fs.readFileSync(f, 'utf8') };
}
function close(st) {
  if (!st) return;
  if (st.src !== st.orig) { fs.writeFileSync(st.file, st.src, 'utf8'); log('>> voasoratra: ' + st.file); }
  else log('>> tsy niova: ' + st.file);
}

/* ════════════════════════════ HOME.JSX ════════════════════════════ */
const H = open('src/pages/Home.jsx');
if (H) {

rep(H, 'Home/import useNavigationType',
  "import { useNavigate, useLocation } from 'react-router-dom';",
  "import { useNavigate, useLocation, useNavigationType } from 'react-router-dom';",
  'useNavigationType');

rep(H, 'Home/StoryVideoThumb + feedSnapshot',
  "// Video ao amin'ny fil d'actualités — milalao ho azy rehefa hita ~60% amin'ny écran",
`// ── Snapshot an'ny fil d'actualités (mitahiry ny toetra manontolo) ──
// Rehefa manindry publication (mankany /post/:id) dia tehirizina eto ny order +
// contenu + cursor + visibleCount + seed + toerana scroll. Rehefa miverina (retour
// = navigation POP) dia averina TSY MIOVA ny fil ka mijanona AMIN'NY publication
// nokitihina — fa TSY miakatra any an-tampony.
let feedSnapshot = null;

// ── Miniature an'ny story vidéo — mety FOANA amin'ny APK (Android WebView) ──
// Raha misy thumbURL → <img> ; raha tsy misy → fragment "#t=0.1" + seek an-tery
// mba haneho ny frame voalohany (fa tsy mainty). Tsy mila canvas na CORS.
function StoryVideoThumb({ thumbURL, mediaURL }) {
  if (thumbURL) return <img src={thumbURL} alt="" />;
  const src = mediaURL ? (mediaURL.includes('#') ? mediaURL : mediaURL + '#t=0.1') : mediaURL;
  return (
    <video
      src={src}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => { try { if (e.target.currentTime < 0.1) e.target.currentTime = 0.1; } catch {} }}
    />
  );
}

// Video ao amin'ny fil d'actualités — milalao ho azy rehefa hita ~60% amin'ny écran`,
  'function StoryVideoThumb');

rep(H, 'Home/navType + willRestoreFeed',
  '  const navigate = useNavigate();',
`  const navigate = useNavigate();
  const navType  = useNavigationType();   // 'POP' rehefa retour
  // Hamerina ny fil (order+scroll) ve? Eny raha retour (POP) ary misy snapshot.
  const willRestoreFeed = useRef(navType === 'POP' && !!feedSnapshot);`,
  'willRestoreFeed');

rep(H, 'Home/shuffleSeed avy amin\'ny snapshot',
  '  const [shuffleSeed, setShuffleSeed] = useState(() => Date.now());',
`  const [shuffleSeed, setShuffleSeed] = useState(() =>
    (willRestoreFeed.current && feedSnapshot) ? feedSnapshot.seed : Date.now());`,
  'feedSnapshot.seed : Date.now()');

rep(H, 'Home/FIRST_PAGE = 30',
  '  const PAGE_SIZE = 20;',
`  const PAGE_SIZE = 20;
  // Chargement voalohany : 30 (mba hisian'ny récence samy hafa hifangaro), avy eo
  // 20 isaky ny pagination (scroll). Mitsitsy forfait, tsy misy loading tsy mijanona.
  const FIRST_PAGE = 30;`,
  'FIRST_PAGE = 30');

repBlock(H, 'Home/classement (récence douce + shuffle)',
  '    const scoreOf = (pp) => {', '\n    };',
`    const scoreOf = (pp) => {
      const boosted = pp.isBoosted && pp.boostUntil && new Date(pp.boostUntil) > nowD
        && isInZones(ctx.lat, ctx.lng, pp.boostZones);
      const hoursAgo = (nowMs - tsMs(pp.createdAt)) / 3600000;
      const mine   = pp.uid === ctx.myUid ? 24 : 0;
      const friend = ctx.aff.has(pp.uid) ? 14 : 0;
      const reacts = Object.keys(pp.reactions || {}).length;
      const vues   = Math.min(pp.views || 0, 300);
      const engage = reacts * 1.0 + vues * 0.02;
      const city   = (pp.authorCity || pp.location || '').trim().toLowerCase();
      const local  = ctx.myCity && city && (city.includes(ctx.myCity) || ctx.myCity.includes(city)) ? 6 : 0;
      const newReg = ctx.newUids.has(pp.uid) ? 5 + local : 0;
      const shopGroup = (pp.shopId || pp.groupId || pp.isShop || pp.artistId) ? rnd(pp.id + 'sg') * 6 : 0;

      // RÉCENCE "douce" par paliers : mankasitraka ny vaovao NEFA tsy mamatotra azy
      // ho fixe ambony indrindra → mamela ny shuffle hanova filaharana isaky ny refresh
      let recency;
      if      (hoursAgo < 6)   recency = 34;
      else if (hoursAgo < 24)  recency = 27;
      else if (hoursAgo < 72)  recency = 20;
      else if (hoursAgo < 168) recency = 12;
      else                     recency = 5;
      recency -= hoursAgo * 0.03;

      const shuffle = rnd(pp.id) * 22;   // fiovaovana matanjaka isaky ny refresh

      return (boosted ? 1e6 : 0)
        + mine + friend + engage + local + newReg + shopGroup
        + recency + shuffle;
    };`,
  'recency -= hoursAgo * 0.03');

rep(H, 'Home/pageLimit (30 voalohany)',
`      const q = first
        ? query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE))`,
`      const pageLimit = first ? FIRST_PAGE : PAGE_SIZE;
      const q = first
        ? query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(FIRST_PAGE))`,
  'const pageLimit = first');

rep(H, 'Home/reachedEnd araka ny pageLimit',
  '      if (snap.docs.length < PAGE_SIZE) setReachedEnd(true);',
  '      if (snap.docs.length < pageLimit) setReachedEnd(true);',
  'snap.docs.length < pageLimit');

rep(H, 'Home/refresh manafoana ny snapshot',
  '  const refreshFeed = async () => {',
`  const refreshFeed = async () => {
    feedSnapshot = null;                            // refresh = fil vaovao`,
  'feedSnapshot = null;                            // refresh');

rep(H, 'Home/openPost + famerenana toerana',
  '  useEffect(() => { loadFeedPage(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);',
`  // Manindry publication → tehirizina ny toetry ny fil sy ny toerana scroll
  const openPost = (id) => {
    feedSnapshot = {
      order, feedRaw, visibleCount,
      cursor: cursorRef.current, reachedEnd,
      seed: shuffleSeed,
      scrollY: window.scrollY || document.documentElement.scrollTop || 0,
      ts: Date.now(),
    };
    navigate('/post/' + id);
  };

  useEffect(() => {
    if (willRestoreFeed.current && feedSnapshot) {
      const s = feedSnapshot; feedSnapshot = null;   // consomée indray mandeha
      setFeedRaw(s.feedRaw);
      setOrder(s.order);
      setVisibleCount(s.visibleCount);
      setReachedEnd(s.reachedEnd);
      cursorRef.current = s.cursor;
      // setPosts mivantana (filtre mitovy amin'ny effet dérivé) → tsy misy flash empty
      const blocked = userProfile?.blocked || [];
      const myFriends = userProfile?.friends || [];
      const byId = new Map(s.feedRaw.map(x => [x.id, x]));
      const visible = (p) => !!p && !blocked.includes(p.uid)
        && (p.uid === currentUser?.uid || (p.audience === 'friends' ? myFriends.includes(p.uid) : p.audience !== 'me'));
      setPosts(s.order.map(id => byId.get(id)).filter(visible));
      setPostsLoading(false);
      let tries = 0;
      const restoreScroll = () => {
        window.scrollTo(0, s.scrollY);
        if (++tries < 8) requestAnimationFrame(restoreScroll);
      };
      requestAnimationFrame(restoreScroll);
      const t1 = setTimeout(() => window.scrollTo(0, s.scrollY), 180);
      const t2 = setTimeout(() => window.scrollTo(0, s.scrollY), 400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    feedSnapshot = null;   // fidirana vaovao → hadino ny snapshot
    loadFeedPage(true);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);`,
  'const openPost = (id) => {');

repAll(H, 'Home/story thumbnail',
  '(last.thumbURL ? <img src={last.thumbURL} alt="" /> : <video src={last.mediaURL} muted playsInline preload="metadata" />)',
  '<StoryVideoThumb thumbURL={last.thumbURL} mediaURL={last.mediaURL} />');

repAll(H, 'Home/clic publication', 'navigate(`/post/${post.id}`)', 'openPost(post.id)');
repAll(H, 'Home/clic partage', 'navigate(`/post/${post.sharedFrom.id}`)', 'openPost(post.sharedFrom.id)');
repAll(H, 'Home/clic commentaire', "navigate('/post/' + post.id)", 'openPost(post.id)');

close(H);
}

/* ══════════════════════════ GROUPPAGE.JSX ══════════════════════════ */
const G = open('src/pages/GroupPage.jsx');
if (G) {

rep(G, 'Groupe/import useNavigationType',
  "import { useParams, useNavigate } from 'react-router-dom';",
  "import { useParams, useNavigate, useNavigationType } from 'react-router-dom';",
  'useNavigationType');

rep(G, 'Groupe/groupSnapshot',
  "const REACTIONS = ['❤️','😂','😮','😢','😡','👍'];",
`const REACTIONS = ['❤️','😂','😮','😢','😡','👍'];

// Snapshot an'ny fil du groupe (seed + visibleCount + scroll) mba hiverenana AMIN'NY
// publication nokitihina rehefa retour (POP) avy amin'ny détails.
let groupSnapshot = null;`,
  'let groupSnapshot');

rep(G, 'Groupe/navType + restoringGroup',
  '  const navigate = useNavigate();',
`  const navigate = useNavigate();
  const navType  = useNavigationType();   // 'POP' rehefa retour
  const restoringGroup = navType === 'POP' && groupSnapshot && groupSnapshot.groupId === groupId;
  const pendingScrollRef = useRef(restoringGroup ? groupSnapshot.scrollY : null);`,
  'restoringGroup');

rep(G, 'Groupe/seed + visibleCount averina',
  '  const [visibleCount, setVisibleCount] = useState(10);',
`  const [visibleCount, setVisibleCount] = useState(restoringGroup ? groupSnapshot.visibleCount : 10);
  // Seed stable par montage : isaky ny pull-to-refresh dia remount ny page → seed
  // vaovao → mifandimby ny post miseho ambony. Rehefa retour (POP) kosa dia averina
  // ny seed teo aloha mba hitovian'ny filaharana.
  const groupSeedRef = useRef(restoringGroup ? groupSnapshot.seed : Date.now());`,
  'groupSeedRef');

repBlock(G, 'Groupe/classement + famerenana toerana + openPost',
  '  // Publications du groupe', '  }, [groupId]);',
`  // Publications du groupe (tri côté client — pas d'index composite requis)
  // Classement "façon Facebook" : sponsorisé en haut → post-nao → récence douce
  // + shuffle par refresh. Ny score dia mampiasa champs IMMUABLES ihany (createdAt,
  // uid, id, boost) → tsy mifindra ny cartes rehefa miova ny réactions/vues.
  useEffect(() => {
    const seed = groupSeedRef.current;
    const myUid = currentUser?.uid || null;
    const nowMs = Date.now(), nowD = new Date();
    const tsMs = (v) => (v?.seconds ? v.seconds * 1000 : (v?._seconds ? v._seconds * 1000 : 0));
    const rnd = (id) => {
      let h = 2166136261; const str = String(id) + ':' + seed;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return ((h >>> 0) % 1000) / 1000;
    };
    const scoreOf = (p) => {
      const boosted = p.isBoosted && p.boostUntil && new Date(p.boostUntil) > nowD;
      const hoursAgo = (nowMs - tsMs(p.createdAt)) / 3600000;
      const mine = p.uid === myUid ? 24 : 0;
      let recency;
      if      (hoursAgo < 6)   recency = 34;
      else if (hoursAgo < 24)  recency = 27;
      else if (hoursAgo < 72)  recency = 20;
      else if (hoursAgo < 168) recency = 12;
      else                     recency = 5;
      recency -= hoursAgo * 0.03;
      const shuffle = rnd(p.id) * 22;
      return (boosted ? 1e6 : 0) + mine + recency + shuffle;
    };
    const q = query(collection(db, 'posts'), where('groupId', '==', groupId));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => scoreOf(b) - scoreOf(a));
      setPosts(list);
    }, err => console.error('Lecture posts groupe:', err?.message || err));
    return () => unsub();
  }, [groupId, currentUser?.uid]);

  // Consommer ny snapshot indray mandeha
  useEffect(() => { groupSnapshot = null; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Averina ny toerana scroll rehefa vita ny fisehoan'ny posts
  useEffect(() => {
    if (pendingScrollRef.current == null || !posts.length) return;
    const y = pendingScrollRef.current;
    pendingScrollRef.current = null;
    let tries = 0;
    const go = () => { window.scrollTo(0, y); if (++tries < 8) requestAnimationFrame(go); };
    requestAnimationFrame(go);
    const t1 = setTimeout(() => window.scrollTo(0, y), 180);
    const t2 = setTimeout(() => window.scrollTo(0, y), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [posts.length]);

  // Manindry publication → tehirizina ny toetry ny fil alohan'ny détails
  const openPost = (id) => {
    groupSnapshot = {
      groupId,
      seed: groupSeedRef.current,
      visibleCount,
      scrollY: window.scrollY || document.documentElement.scrollTop || 0,
    };
    navigate('/post/' + id);
  };`,
  'const openPost = (id) => {');

repAll(G, 'Groupe/clic publication', 'navigate(`/post/${post.id}`)', 'openPost(post.id)');
repAll(G, 'Groupe/clic partage', 'navigate(`/post/${post.sharedFrom.id}`)', 'openPost(post.sharedFrom.id)');

close(G);
}

console.log(FAIL === 0 ? '\n✅ VITA TSARA — tsy misy diso.' : '\n❌ Nisy ' + FAIL + ' diso — aza mi-build, alefaso amiko ny sortie.');
process.exit(FAIL === 0 ? 0 : 1);
