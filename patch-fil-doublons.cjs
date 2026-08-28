/**
 * patch-fil-doublons.cjs   —  Sorohana ny fiverimberenan'ny publication
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA : ny fisorohana ankehitriny dia mijery ny LOHA TELO ihany :
 *
 *     const head = ranked.slice(0, 3).map(r => r.id).join('|');
 *
 *   Ny publication ao AFOVOANY dia mety hiseho indray amin'ny pejy manaraka —
 *   tsy tratra. Izay no mahatonga ny « miverimberina eo ilay efa nandalo ».
 *
 * FANITSIANA : `Set` mitazona ny `id` REHETRA efa naseho.
 *   • Ny pejy manaraka dia SIVANINA amin'io Set io.
 *   • Diovina rehefa `first` (fanokafana na refresh) — ka miova tsara ny
 *     filaharana araka ny efa misy.
 *
 * ⚠️ TSY VOAKASIKA : ny seed, ny bonus `mine = 8`, ny music card, ny
 *   `lastHeadRef` (fisorohana loha), ny pins, ny optimistic.
 *
 * VOAKASIKA : src/pages/Home.jsx
 *
 * Fampandehanana :  node patch-fil-doublons.cjs --dry
 *                   node patch-fil-doublons.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const F = path.join(process.cwd(), 'src/pages/Home.jsx');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/pages/Home.jsx'); process.exit(1); }

let s = fs.readFileSync(F, 'utf8');
const c = (x) => s.split(x).length - 1;
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };
if (s.includes('seenIdsRef')) { console.log('⏭  efa voapatch'); process.exit(0); }

/* ── ① Ref vaovao ── */
const R_OLD = "  const lastHeadRef = useRef('');";
if (c(R_OLD) !== 1) fail('lastHeadRef tsy hita');
s = s.replace(R_OLD, R_OLD +
  "\n  // `id` REHETRA efa naseho — sorohana ny fiverimberenana amin'ny pagination.\n" +
  "  // Diovina isaky ny `first` (fanokafana / refresh).\n" +
  "  const seenIdsRef = useRef(new Set());");

/* ── ② Fanadiovana rehefa first, sivana rehefa pagination ── */
const A_OLD = `      const rankedIds = ranked.map(r => r.id);
      const serverIds = new Set(rankedIds);`;
if (c(A_OLD) !== 1) fail('bloc rankedIds tsy hita');
s = s.replace(A_OLD,
`      // Fanokafana / refresh → diovina ; pagination → esorina ny efa naseho
      if (first) seenIdsRef.current = new Set();
      else ranked = ranked.filter(r => !seenIdsRef.current.has(r.id));
      ranked.forEach(r => seenIdsRef.current.add(r.id));

      const rankedIds = ranked.map(r => r.id);
      const serverIds = new Set(rankedIds);`);

/* ── Fanamarinana ── */
if (!s.includes('const seenIdsRef = useRef(new Set());')) fail('ref tsy tafiditra');
if (!s.includes('if (first) seenIdsRef.current = new Set();')) fail('fanadiovana very');
if (!s.includes('ranked = ranked.filter(r => !seenIdsRef.current.has(r.id));')) fail('sivana very');
if (!s.includes('ranked.forEach(r => seenIdsRef.current.add(r.id));')) fail('fitehirizana very');
// Tsy voakasika
if (!s.includes('lastHeadRef.current = ranked.slice(0, 3)')) fail('lastHeadRef simba');
if (!s.includes('const mine   = pp.uid === ctx.myUid ? 8 : 0;')) fail('bonus 8 voakasika');
if (!s.includes('seed: shuffleSeed')) fail('seed voakasika');
if (!s.includes('optimisticIdsRef')) fail('optimistic simba');
if (!s.includes('getPins()')) fail('pins simba');
if (!s.includes('let ranked = rankPosts(rows);')) fail('rankPosts simba');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY ? '✅ DRY-RUN (tsy nisy nosoratana)' : '✅ Patch vita : tsy misy fiverimberenana');
