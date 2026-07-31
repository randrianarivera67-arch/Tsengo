// test-lite-pagesize.mjs — Mode Lite : pejy kely kokoa
//
// Ny tena zava-dehibe eto : ny FIRST_PAGE (12) dia AMBANY noho ny
// visibleCount (20). Ka tsy maintsy hamarinina fa TSY miteraka boucle
// fampiakarana ny sentinel — io no bug efa nisy taloha.
//
// Fampandehanana :  node test-lite-pagesize.mjs
import fs from 'fs';

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) { pass++; console.log('  ✔ ' + label); }
  else { fail++; console.log('  ✘ ' + label + '\n      got  ' + a + '\n      want ' + b); }
};
const ok = (label, cond, info = '') => {
  if (cond) { pass++; console.log('  ✔ ' + label + (info ? '  (' + info + ')' : '')); }
  else { fail++; console.log('  ✘ ' + label + '  ' + info); }
};

const SRC = fs.readFileSync('./src/pages/Home.jsx', 'utf8');

/* ═══ 1. Sanda ═══════════════════════════════════════════════════════════ */
console.log('1) Sanda araka ny mode');
ok('PAGE_SIZE conditionnel', SRC.includes('const PAGE_SIZE = lite ? 10 : 20;'));
ok('FIRST_PAGE conditionnel', SRC.includes('const FIRST_PAGE = lite ? 12 : 30;'));
ok('visibleCount mbola 20', SRC.includes('useState(20);   // affichage progressif'));

console.log('\n   Fandrefesana');
{
  const lite = { first: 12, page: 10 }, normal = { first: 30, page: 20 };
  eq('Lite : −60 % amin\'ny fidirana', Math.round((1 - lite.first / normal.first) * 100), 60);
  eq('Lite : −50 % isaky ny scroll', Math.round((1 - lite.page / normal.page) * 100), 50);
  ok('FIRST_PAGE(lite) < visibleCount → miseho avy hatrany', 12 < 20);
}

/* ═══ 2. `lite` voafaritra mialoha ═══════════════════════════════════════ */
console.log('\n2) Filaharana ao amin\'ny composant');
{
  const iLite = SRC.indexOf('const [lite, setLiteState]');
  const iPage = SRC.indexOf('const PAGE_SIZE =');
  ok('`lite` voafaritra alohan\'ny PAGE_SIZE', iLite !== -1 && iLite < iPage,
     'lite@' + iLite + ' < PAGE_SIZE@' + iPage);
  ok('loadFeedPage tsy useCallback (mandray sanda vaovao)',
     SRC.includes('const loadFeedPage = async (first) => {'));
}

/* ═══ 3. SENTINEL — tsy miteraka boucle na dia 12 < 20 aza ══════════════ */
console.log('\n3) Sentinel — tsy misy boucle (io no bug taloha)');
{
  // Fakana ny callback ref MARINA ao amin'ny fichier
  const j = SRC.indexOf('<div ref={el => {');
  const from = SRC.indexOf('{', j + 14);
  let d = 0, k = from;
  for (; k < SRC.length; k++) {
    if (SRC[k] === '{') d++;
    else if (SRC[k] === '}') { d--; if (d === 0) break; }
  }
  const body = SRC.slice(from + 1, k);

  function run({ feedLen, visibleCount, reachedEnd, renders = 1, fires = 1 }) {
    const live = new Set();
    const calls = { load: 0, reveal: 0 };
    let vc = visibleCount;
    class IO {
      constructor(cb) { this.cb = cb; this.dead = false; live.add(this); }
      observe() {} disconnect() { this.dead = true; live.delete(this); }
      fire() { if (!this.dead) this.cb([{ isIntersecting: true }]); }
    }
    const ref = { current: null };
    const fn = new Function('el', 'sentinelIoRef', 'IntersectionObserver', 'feedLen',
      'visibleCount', 'reachedEnd', 'setVisibleCount', 'loadFeedPage', 'Math', body);
    for (let r = 0; r < renders; r++) {
      fn(null, ref, IO, feedLen, vc, reachedEnd,
        (f) => { calls.reveal++; vc = typeof f === 'function' ? f(vc) : f; },
        () => calls.load++, Math);
      fn({}, ref, IO, feedLen, vc, reachedEnd,
        (f) => { calls.reveal++; vc = typeof f === 'function' ? f(vc) : f; },
        () => calls.load++, Math);
    }
    for (let f = 0; f < fires; f++) [...live].forEach(o => o.fire());
    return { ...calls, visibleCount: vc, observers: live.size };
  }

  // Toe-javatra Lite : pejy 12 voampidy, visibleCount 20
  let r = run({ feedLen: 12, visibleCount: 20, reachedEnd: false, renders: 10 });
  eq('render 10 → observer 1 ihany', r.observers, 1);
  eq('fipoahana 1 → antso load 1 ihany', r.load, 1);
  eq('tsy nampiakatra visibleCount (12 < 20)', r.reveal, 0);

  // Aorian'ny pejy faharoa : 22 voampidy
  r = run({ feedLen: 22, visibleCount: 20, reachedEnd: false, renders: 5 });
  eq('22 > 20 → aseho aloha, tsy maka', r.load, 0);
  eq('visibleCount 20 → 22 (voafetra)', r.visibleCount, 22);

  // Tapitra
  r = run({ feedLen: 12, visibleCount: 20, reachedEnd: true, renders: 5, fires: 3 });
  eq('reachedEnd → tsy misy antso mihitsy', r.load, 0);
}

/* ═══ 4. Tsy Lite → tsy misy fiovana ═══════════════════════════════════ */
console.log('\n4) Tsy Lite — tsy misy fiovana');
ok('30 mbola ao ho an\'ny mahazatra', SRC.includes('lite ? 12 : 30'));
ok('20 mbola ao ho an\'ny mahazatra', SRC.includes('lite ? 10 : 20'));

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
