/* patch-tsengo-v12.cjs — Tsengo / Trengo (tohin'ny v11)
 * 1) Filaharana MIFAMADIKA TANTERAKA isaky ny refresh (Home + Groupe) :
 *    tsy voatery manaraka daty, ary tsy miverina ilay filaharana teo aloha.
 * 2) Retour avy amin'ny détails : miverina MARINA amin'ny publication nokitihina
 *    (anchor amin'ny carte fa tsy pixel) → tsy "indraindray mety" intsony.
 * Azo averina alefa (idempotent).
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
  const s = fs.readFileSync(f, 'utf8');
  return { file: f, src: s, orig: s };
}
function close(st) {
  if (!st) return;
  if (st.src !== st.orig) { fs.writeFileSync(st.file, st.src, 'utf8'); log('>> voasoratra: ' + st.file); }
  else log('>> tsy niova: ' + st.file);
}

/* ════════════════════════════ HOME.JSX ════════════════════════════ */
const H = open('src/pages/Home.jsx');
if (H) {

rep(H, 'Home/lastHeadRef',
  '  const scoreCtxRef = useRef({ seed: Date.now() });',
`  const scoreCtxRef = useRef({ seed: Date.now() });
  const lastHeadRef = useRef('');   // lohan'ny filaharana teo aloha (sorohana ny fiverimberenana)`,
  'lastHeadRef');

repBlock(H, 'Home/classement SHUFFLE mibahana',
  '    const scoreOf = (pp) => {', '\n    };',
`    const scoreOf = (pp) => {
      const boosted = pp.isBoosted && pp.boostUntil && new Date(pp.boostUntil) > nowD
        && isInZones(ctx.lat, ctx.lng, pp.boostZones);
      const hoursAgo = (nowMs - tsMs(pp.createdAt)) / 3600000;

      // ── SHUFFLE MIBAHANA (0 → 100) ──────────────────────────────────────────
      // Isaky ny refresh dia seed vaovao → MIFAMADIKA TANTERAKA ny filaharana.
      // TSY voatery manaraka daty : mety ho voalohany ny "il y a 2j", faharoa ny
      // "6h", fahatelo ny "1h"… dia miova indray amin'ny refresh manaraka.
      const shuffle = rnd(pp.id) * 100;

      // ── Tombony KELY monja (tsy mahasakana ny fifamadihana) ─────────────────
      let recency;
      if      (hoursAgo < 6)   recency = 14;
      else if (hoursAgo < 24)  recency = 10;
      else if (hoursAgo < 72)  recency = 6;
      else if (hoursAgo < 168) recency = 3;
      else                     recency = 0;

      const mine   = pp.uid === ctx.myUid ? 8 : 0;
      const friend = ctx.aff.has(pp.uid) ? 6 : 0;
      const reacts = Math.min(Object.keys(pp.reactions || {}).length, 20);
      const vues   = Math.min(pp.views || 0, 300);
      const engage = reacts * 0.25 + vues * 0.005;                  // 0 → 6.5
      const city   = (pp.authorCity || pp.location || '').trim().toLowerCase();
      const local  = ctx.myCity && city && (city.includes(ctx.myCity) || ctx.myCity.includes(city)) ? 3 : 0;
      const newReg = ctx.newUids.has(pp.uid) ? 3 : 0;
      const shopGroup = (pp.shopId || pp.groupId || pp.isShop || pp.artistId) ? rnd(pp.id + 'sg') * 4 : 0;

      return (boosted ? 1e6 : 0)
        + shuffle
        + recency + mine + friend + engage + local + newReg + shopGroup;
    };`,
  'rnd(pp.id) * 100');

rep(H, 'Home/antoka filaharana vaovao',
  '      const rankedIds = rankPosts(rows).map(r => r.id);',
`      let ranked = rankPosts(rows);
      // ── Antoka fa TSY mitovy amin'ny filaharana teo aloha ──
      // Raha sendra mitovy ihany ny lohany (ny 3 voalohany), dia averina ny seed
      // ka atao indray ny classement → filaharana VAOVAO tokoa isaky ny refresh.
      if (first) {
        for (let k = 0; k < 4; k++) {
          const head = ranked.slice(0, 3).map(r => r.id).join('|');
          if (!head || head !== lastHeadRef.current) break;
          scoreCtxRef.current = { ...scoreCtxRef.current, seed: Date.now() + k * 7919 + 13 };
          ranked = rankPosts(rows);
        }
        lastHeadRef.current = ranked.slice(0, 3).map(r => r.id).join('|');
      }
      const rankedIds = ranked.map(r => r.id);`,
  'lastHeadRef.current =');

rep(H, 'Home/anchor id amin\'ny carte',
  '          <div key={post.id}>',
  "          <div key={post.id} id={'post-' + post.id}>",
  "<div key={post.id} id={'post-' + post.id}>");

rep(H, 'Home/openPost mitahiry anchor',
`  const openPost = (id) => {
    feedSnapshot = {
      order, feedRaw, visibleCount,
      cursor: cursorRef.current, reachedEnd,
      seed: shuffleSeed,
      scrollY: window.scrollY || document.documentElement.scrollTop || 0,
      ts: Date.now(),
    };
    navigate('/post/' + id);
  };`,
`  // anchorId = ny publication hiverenana (ny carte ao amin'ny fil)
  const openPost = (id, anchorId) => {
    const aId = anchorId || id;
    const el  = document.getElementById('post-' + aId);
    feedSnapshot = {
      order, feedRaw, visibleCount,
      cursor: cursorRef.current, reachedEnd,
      seed: shuffleSeed,
      scrollY: window.scrollY || document.documentElement.scrollTop || 0,
      anchorId: aId,
      anchorTop: el ? el.getBoundingClientRect().top : null,
      ts: Date.now(),
    };
    navigate('/post/' + id);
  };`,
  'anchorTop: el ?');

rep(H, 'Home/famerenana amin\'ny anchor',
`      setPostsLoading(false);
      let tries = 0;
      const restoreScroll = () => {
        window.scrollTo(0, s.scrollY);
        if (++tries < 8) requestAnimationFrame(restoreScroll);
      };
      requestAnimationFrame(restoreScroll);
      const t1 = setTimeout(() => window.scrollTo(0, s.scrollY), 180);
      const t2 = setTimeout(() => window.scrollTo(0, s.scrollY), 400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }`,
`      setPostsLoading(false);

      // ── Famerenana AMIN'NY publication nokitihina (anchor) fa TSY amin'ny pixel ──
      // Miova ny haavon'ny pejy rehefa tonga tsikelikely ny sary (SmartImage minHeight
      // 240 → haavo tena izy), ka ny "scrollY" irery dia tsy mahatoky (indraindray
      // mety, indraindray tsy mety). Ity kosa manitsy ny tenany isaky ny 90ms mandra-
      // pahatapitry ny 2,5s — na mijanona avy hatrany raha mikasika ny écran ny olona.
      let timer = null;
      const onUser = () => stopRestore();
      function stopRestore() {
        if (timer) clearTimeout(timer);
        timer = null;
        window.removeEventListener('touchstart', onUser);
        window.removeEventListener('wheel', onUser);
      }
      window.addEventListener('touchstart', onUser, { passive: true });
      window.addEventListener('wheel', onUser, { passive: true });
      const t0 = Date.now();
      const tick = () => {
        const el = s.anchorId ? document.getElementById('post-' + s.anchorId) : null;
        if (el && s.anchorTop != null) {
          const delta = el.getBoundingClientRect().top - s.anchorTop;
          if (Math.abs(delta) > 1) window.scrollBy(0, delta);   // averina eo amin'ny toerana marina
        } else {
          window.scrollTo(0, s.scrollY);                        // fallback
        }
        if (Date.now() - t0 < 2500) timer = setTimeout(tick, 90);
        else stopRestore();
      };
      timer = setTimeout(tick, 0);
      return stopRestore;
    }`,
  'function stopRestore');

repAll(H, 'Home/anchor amin\'ny partage',
  'openPost(post.sharedFrom.id)', 'openPost(post.sharedFrom.id, post.id)');

close(H);
}

/* ══════════════════════════ GROUPPAGE.JSX ══════════════════════════ */
const G = open('src/pages/GroupPage.jsx');
if (G) {

rep(G, 'Groupe/lastGroupHead',
  'let groupSnapshot = null;',
`let groupSnapshot = null;
let lastGroupHead = '';   // lohan'ny filaharana teo aloha (sorohana ny fiverimberenana)`,
  'lastGroupHead');

rep(G, 'Groupe/pendingScroll + anchor',
  '  const pendingScrollRef = useRef(restoringGroup ? groupSnapshot.scrollY : null);',
`  const pendingScrollRef = useRef(restoringGroup
    ? { scrollY: groupSnapshot.scrollY, anchorId: groupSnapshot.anchorId, anchorTop: groupSnapshot.anchorTop }
    : null);`,
  'anchorId: groupSnapshot.anchorId');

repBlock(G, 'Groupe/classement SHUFFLE mibahana',
  '  useEffect(() => {\n    const seed = groupSeedRef.current;',
  '  }, [groupId, currentUser?.uid]);',
`  useEffect(() => {
    let seed = groupSeedRef.current;
    const myUid = currentUser?.uid || null;
    const nowMs = Date.now(), nowD = new Date();
    const tsMs = (v) => (v?.seconds ? v.seconds * 1000 : (v?._seconds ? v._seconds * 1000 : 0));
    const rnd = (id, sd) => {
      let h = 2166136261; const str = String(id) + ':' + sd;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return ((h >>> 0) % 1000) / 1000;
    };
    const rank = (list, sd) => {
      const scoreOf = (p) => {
        const boosted = p.isBoosted && p.boostUntil && new Date(p.boostUntil) > nowD;
        const hoursAgo = (nowMs - tsMs(p.createdAt)) / 3600000;
        const shuffle = rnd(p.id, sd) * 100;   // MIBAHANA → mifamadika isaky ny refresh
        let recency;
        if      (hoursAgo < 6)   recency = 14;
        else if (hoursAgo < 24)  recency = 10;
        else if (hoursAgo < 72)  recency = 6;
        else if (hoursAgo < 168) recency = 3;
        else                     recency = 0;
        const mine = p.uid === myUid ? 8 : 0;
        return (boosted ? 1e6 : 0) + shuffle + recency + mine;
      };
      return [...list].sort((a, b) => scoreOf(b) - scoreOf(a));
    };
    const q = query(collection(db, 'posts'), where('groupId', '==', groupId));
    const unsub = onSnapshot(q, snap => {
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      let list = rank(raw, seed);
      // Antoka fa tsy mitovy amin'ny filaharana teo aloha (raha refresh)
      for (let k = 0; k < 4; k++) {
        const head = list.slice(0, 3).map(p => p.id).join('|');
        if (!head || head !== lastGroupHead) break;
        seed = Date.now() + k * 7919 + 13;
        list = rank(raw, seed);
      }
      lastGroupHead = list.slice(0, 3).map(p => p.id).join('|');
      setPosts(list);
    }, err => console.error('Lecture posts groupe:', err?.message || err));
    return () => unsub();
  }, [groupId, currentUser?.uid]);`,
  'rnd(p.id, sd) * 100');

repBlock(G, 'Groupe/famerenana amin\'ny anchor',
  "  // Averina ny toerana scroll rehefa vita ny fisehoan'ny posts",
  '  }, [posts.length]);',
`  // Averina AMIN'NY publication nokitihina (anchor) rehefa vita ny fisehoan'ny posts
  useEffect(() => {
    if (pendingScrollRef.current == null || !posts.length) return;
    const s = pendingScrollRef.current;
    pendingScrollRef.current = null;
    let timer = null;
    const onUser = () => stopRestore();
    function stopRestore() {
      if (timer) clearTimeout(timer);
      timer = null;
      window.removeEventListener('touchstart', onUser);
      window.removeEventListener('wheel', onUser);
    }
    window.addEventListener('touchstart', onUser, { passive: true });
    window.addEventListener('wheel', onUser, { passive: true });
    const t0 = Date.now();
    const tick = () => {
      const el = s.anchorId ? document.getElementById('post-' + s.anchorId) : null;
      if (el && s.anchorTop != null) {
        const delta = el.getBoundingClientRect().top - s.anchorTop;
        if (Math.abs(delta) > 1) window.scrollBy(0, delta);
      } else {
        window.scrollTo(0, s.scrollY);
      }
      if (Date.now() - t0 < 2500) timer = setTimeout(tick, 90);
      else stopRestore();
    };
    timer = setTimeout(tick, 0);
    return stopRestore;
  }, [posts.length]);`,
  'function stopRestore');

rep(G, 'Groupe/anchor id amin\'ny carte',
  '          <div key={post.id} className="card post-card animate-fade" style={{ marginBottom: 8 }}>',
  "          <div key={post.id} id={'post-' + post.id} className=\"card post-card animate-fade\" style={{ marginBottom: 8 }}>",
  "id={'post-' + post.id} className=\"card post-card animate-fade\"");

rep(G, 'Groupe/openPost mitahiry anchor',
`  const openPost = (id) => {
    groupSnapshot = {
      groupId,
      seed: groupSeedRef.current,
      visibleCount,
      scrollY: window.scrollY || document.documentElement.scrollTop || 0,
    };
    navigate('/post/' + id);
  };`,
`  const openPost = (id, anchorId) => {
    const aId = anchorId || id;
    const el  = document.getElementById('post-' + aId);
    groupSnapshot = {
      groupId,
      seed: groupSeedRef.current,
      visibleCount,
      scrollY: window.scrollY || document.documentElement.scrollTop || 0,
      anchorId: aId,
      anchorTop: el ? el.getBoundingClientRect().top : null,
    };
    navigate('/post/' + id);
  };`,
  'anchorTop: el ?');

repAll(G, 'Groupe/anchor amin\'ny partage',
  'openPost(post.sharedFrom.id)', 'openPost(post.sharedFrom.id, post.id)');

close(G);
}

console.log(FAIL === 0 ? '\n✅ VITA TSARA — tsy misy diso.' : '\n❌ Nisy ' + FAIL + ' diso — aza mi-build, alefaso amiko ny sortie.');
process.exit(FAIL === 0 ? 0 : 1);
