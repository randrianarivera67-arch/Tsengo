// test-mode-lite.mjs — TESTE ny Mode Lite
//
// 1. Ny fonction MARINA ao amin'ny liteMode.js (localStorage sandoka)
// 2. Fanamarinana statique : voarohy tsara ve ny guard, ary TSY voakasika ve
//    ny Messages / notification (izay tsy azo esorina ny realtime)
//
// Fampandehanana :  node test-mode-lite.mjs
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

/* ── localStorage sandoka + fampidirana ny module marina ─────────────────── */
function makeLite({ broken = false } = {}) {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => { if (broken) throw new Error('nope'); return k in store ? store[k] : null; },
    setItem: (k, v) => { if (broken) throw new Error('nope'); store[k] = String(v); },
  };
  const SRC = fs.readFileSync('./src/utils/liteMode.js', 'utf8')
    .replace(/^export /gm, '');
  const build = new Function('localStorage', 'Set',
    SRC + '\nreturn { isLiteOn, setLite, subscribeLite };');
  return { api: build(globalThis.localStorage, Set), store };
}

/* ═══ 1. Fototra ═════════════════════════════════════════════════════════ */
console.log('1) isLiteOn / setLite');
{
  const { api, store } = makeLite();
  eq('default = VELONA (par défaut)', api.isLiteOn(), true);

  api.setLite(true);
  eq('velona aorian\'ny setLite(true)', api.isLiteOn(), true);
  eq('voatahiry ho "1"', store['trengo_lite_mode'], '1');

  api.setLite(false);
  eq('maty aorian\'ny setLite(false)', api.isLiteOn(), false);
  eq('voatahiry ho "0"', store['trengo_lite_mode'], '0');

  api.setLite(1);       eq('sanda truthy → velona', api.isLiteOn(), true);
  api.setLite(0);       eq('sanda falsy → maty', api.isLiteOn(), false);
  api.setLite('abc');   eq('chaîne → velona', api.isLiteOn(), true);
  api.setLite(null);    eq('null → maty', api.isLiteOn(), false);
}

/* ═══ 2. localStorage simba — tsy crash ═════════════════════════════════ */
console.log('\n2) localStorage tsy azo — tsy crash');
{
  const { api } = makeLite({ broken: true });
  eq('isLiteOn → true (default)', api.isLiteOn(), true);
  let threw = false;
  try { api.setLite(true); } catch { threw = true; }
  ok('setLite tsy manipy exception', !threw);
}

/* ═══ 3. subscribe ══════════════════════════════════════════════════════ */
console.log('\n3) subscribeLite — fihetsika avy hatrany');
{
  const { api } = makeLite();
  const seen = [];
  const un = api.subscribeLite(v => seen.push(v));

  api.setLite(true);
  api.setLite(false);
  eq('nandray ny fiovana roa', seen, [true, false]);

  un();
  api.setLite(true);
  eq('aorian\'ny unsubscribe : tsy mandray intsony', seen.length, 2);
}

console.log('\n4) Abonné maromaro sy fahadisoana');
{
  const { api } = makeLite();
  const a = [], b = [];
  api.subscribeLite(v => a.push(v));
  api.subscribeLite(() => { throw new Error('composant simba'); });   // arovana
  api.subscribeLite(v => b.push(v));

  let threw = false;
  try { api.setLite(true); } catch { threw = true; }
  ok('abonné simba tsy manakana ny hafa', !threw);
  eq('abonné voalohany nandray', a, [true]);
  eq('abonné farany nandray ihany', b, [true]);
}

/* ═══ 5. Fanamarinana statique — voarohy tsara ═══════════════════════════ */
console.log('\n5) Fanamarinana statique');
{
  const ON = fs.readFileSync('./src/hooks/useOnline.js', 'utf8');
  const HO = fs.readFileSync('./src/pages/Home.jsx', 'utf8');
  const LA = fs.readFileSync('./src/components/Layout.jsx', 'utf8');

  ok('useOnline : guard lite', ON.includes('if (lite) { setMap({}); return; }'));
  ok('useOnline : deps [lite]', ON.includes('}, [lite]);'));
  ok('useOnline : subscribe', ON.includes('subscribeLite(setLiteState)'));

  ok('Home : guard lite', HO.includes('if (lite) { setPostsLoading(false); return; }'));
  ok('Home : deps [lite]', HO.includes('}, [lite]);'));
  ok('Home : subscribe', HO.includes('subscribeLite(setLiteState)'));

  ok('Layout : bokotra toggle', LA.includes('onClick={() => setLite(!liteOn)}'));
  ok('Layout : grille 2 colonnes', LA.includes("gridTemplateColumns: '1fr 1fr'"));
  ok('Layout : aria-pressed', LA.includes('aria-pressed={liteOn}'));
}

/* ═══ 6. TSY VOAKASIKA — realtime tsy azo esorina ═══════════════════════ */
console.log('\n6) Realtime TSY azo esorina — mbola voaaro');
{
  const files = {
    'Messages.jsx': './src/pages/Messages.jsx',
    'AuthContext.jsx': './src/context/AuthContext.jsx',
    'Notifications.jsx': './src/pages/Notifications.jsx',
    'useMessages.js': './src/hooks/useMessages.js',
  };
  for (const [name, p] of Object.entries(files)) {
    const t = fs.readFileSync(p, 'utf8');
    ok(name + ' tsy mikitika ny Lite', !t.includes('liteMode'));
  }
  const MS = fs.readFileSync('./src/pages/Messages.jsx', 'utf8');
  ok('Messages mitazona ny onSnapshot', MS.includes('onSnapshot'));
  const UM = fs.readFileSync('./src/hooks/useMessages.js', 'utf8');
  ok('useMessages mitazona ny onValue', UM.includes('onValue'));
}

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
