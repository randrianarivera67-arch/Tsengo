/**
 * patch-feed-data-fix.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA NOTATERIN'NY MPAMPIASA : mandany forfait be loatra ny APK.
 *
 * FOTOTRA (voamarina tao amin'ny code, Home.jsx ~2747) :
 *
 *   <div ref={el => {
 *     if (!el) return;
 *     const io = new IntersectionObserver(...);   ← VAOVAO ISAKY NY RENDER
 *     io.observe(el);                             ← TSY MISY disconnect()
 *   }}>
 *
 *   Arrow fonction ao anaty `ref` → identité vaovao isaky ny render → React
 *   miantso ref(null) dia ref(el). Ilay `if (!el) return;` dia manalavitra ny
 *   fanesorana → TSY MISY observer voaesorina na oviana na oviana.
 *
 *   Aorian'ny render 10 → observer 10 velona amin'ny node iray → miara-mipoaka :
 *     setVisibleCount(+26) × 10   ary   loadFeedPage(false) × 10
 *
 *   Ary ny sentinel dia aseho FOANA raha mbola `reachedEnd === false`, miaraka
 *   amin'ny rootMargin 1200px (mipoaka 1200 px mialoha).
 *
 *   ⇒ Mampiakatra ny collection `posts` MANONTOLO isaky ny fidirana, fa tsy 30.
 *
 * AMPLIFICATION (izay tena mandany forfait) :
 *   posts.length mitombo → ny compteur `views` (useEffect [posts.length])
 *   manoratra `increment(1)` amin'ny publication an-jatony → ary ny listener
 *   velona `onSnapshot(limit 20)` dia mandefa ny document voava amin'ny
 *   mpampiasa REHETRA mifandray. Ny "vue" an'ny olona iray dia lasa data
 *   ho an'ny 238 rehetra.
 *
 * FANITSIANA (3) :
 *   1. `disconnect()` ny observer taloha alohan'ny hamorona vaovao
 *   2. Aseho aloha ny efa voampidy ; MAKA pejy vaovao rehefa tapitra TOKOA
 *   3. rootMargin 1200px → 400px, ary dingana +26 → +12 voafetra amin'ny feedLen
 *
 * TSY MIKITIKA : ny score/rank, ny pin, ny compression sary/video, ny cache.
 *
 * Fampandehanana :  node patch-feed-data-fix.cjs --dry
 *                   node patch-feed-data-fix.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/pages/Home.jsx');
const DRY = process.argv.includes('--dry');

if (!fs.existsSync(F)) {
  console.error('❌ Tsy hita : src/pages/Home.jsx');
  console.error('   Mandehana ao amin\'ny racine an\'ny frontend (cd ~/Tsengo-fresh).');
  process.exit(1);
}

let s = fs.readFileSync(F, 'utf8');

if (s.includes('sentinelIoRef')) {
  console.log('⏭  Home.jsx : efa voapatch');
  process.exit(0);
}

const countOf = (str, sub) => str.split(sub).length - 1;
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 240) + '\n-----------');
  }
  return src.replace(old, neo);
}

/* ── 1) Ref hitazona ny observer ─────────────────────────────────────────── */
s = rep(s,
  '  const loadingRef = useRef(false);                       // anti double-chargement',
  `  const loadingRef = useRef(false);                       // anti double-chargement
  const sentinelIoRef = useRef(null);                     // observer "Chargement…" (esorina isaky ny render)`,
  'ref');

/* ── 2) Observer voafehy + fepetra fampiakarana ──────────────────────────── */
s = rep(s,
  `            const io = new IntersectionObserver(es => {
              if (!es[0].isIntersecting) return;
              // 1) On revele plus de posts deja charges.
              setVisibleCount(c => c + 26);
              // 2) Charger plus SEULEMENT si une page pleine est deja recue (evite la boucle infinie).
              if (!reachedEnd) loadFeedPage(false);
            }, { rootMargin: '1200px' });
            io.observe(el);`,
  `            const io = new IntersectionObserver(es => {
              if (!es[0].isIntersecting) return;
              // 1) MANEHO aloha ny publication EFA voampidy — tsy mandany data mihitsy.
              if (feedLen > visibleCount) {
                setVisibleCount(c => Math.min(c + 12, feedLen));
                return;
              }
              // 2) MAKA pejy vaovao REHEFA TAPITRA TOKOA ny an-tanana.
              //    Teo aloha dia niantso na dia mbola nisy an-jatony tsy aseho aza.
              if (!reachedEnd) loadFeedPage(false);
            }, { rootMargin: '400px' });
            io.observe(el);
            sentinelIoRef.current = io;`,
  'observer');

/* ── 3) Fanesorana ny observer taloha ────────────────────────────────────── */
s = rep(s,
  `          <div ref={el => {
            if (!el) return;`,
  `          <div ref={el => {
            // ⚠️ FIX FORFAIT : ny observer taloha ESORINA aloha. Tsy nisy izany teo
            // aloha, ka nitambatra isaky ny render, samy niantso loadFeedPage →
            // nampiakatra ny collection manontolo isaky ny fidirana.
            if (sentinelIoRef.current) { sentinelIoRef.current.disconnect(); sentinelIoRef.current = null; }
            if (!el) return;`,
  'disconnect');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY
  ? '✅ DRY-RUN : anchor 3 hita, fanoloana mety (tsy nisy nosoratana)'
  : '✅ Patch vita : src/pages/Home.jsx');
