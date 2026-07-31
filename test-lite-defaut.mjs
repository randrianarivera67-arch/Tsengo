// test-lite-defaut.mjs — TESTE ny dingana 2 an'ny Mode Lite
//   A) Lite par défaut   B) tsy misy autoplay   C) icône néon
//
// Fampandehanana :  node test-lite-defaut.mjs
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

/* ── Module marina + localStorage sandoka ────────────────────────────────── */
function makeLite({ initial = undefined, broken = false } = {}) {
  const store = {};
  if (initial !== undefined) store['trengo_lite_mode'] = initial;
  const ls = {
    getItem: (k) => { if (broken) throw new Error('nope'); return k in store ? store[k] : null; },
    setItem: (k, v) => { if (broken) throw new Error('nope'); store[k] = String(v); },
  };
  const SRC = fs.readFileSync('./src/utils/liteMode.js', 'utf8').replace(/^export /gm, '');
  return {
    api: new Function('localStorage', 'Set', SRC + '\nreturn { isLiteOn, setLite, subscribeLite };')(ls, Set),
    store,
  };
}

/* ═══ A. Lite PAR DÉFAUT ═════════════════════════════════════════════════ */
console.log('A) Mode Lite par défaut');
eq('mpampiasa vaovao (tsy misy clé) → VELONA', makeLite().api.isLiteOn(), true);
eq("efa nisafidy '1' → velona", makeLite({ initial: '1' }).api.isLiteOn(), true);
eq("efa nisafidy '0' → MATY (safidiny voahaja)", makeLite({ initial: '0' }).api.isLiteOn(), false);
eq('sanda hafa → velona', makeLite({ initial: 'xyz' }).api.isLiteOn(), true);
eq('localStorage simba → velona (default)', makeLite({ broken: true }).api.isLiteOn(), true);

console.log('\n   Fanapahana mbola voatahiry tsara');
{
  const { api, store } = makeLite();
  api.setLite(false);
  eq("mamono → voatahiry '0'", store['trengo_lite_mode'], '0');
  eq('maty tokoa', api.isLiteOn(), false);
  api.setLite(true);
  eq("mamelona → voatahiry '1'", store['trengo_lite_mode'], '1');
  eq('velona tokoa', api.isLiteOn(), true);
}

/* ═══ B. Autoplay ════════════════════════════════════════════════════════ */
console.log('\nB) Autoplay video — voasakana amin\'ny Lite');
{
  const HO = fs.readFileSync('./src/pages/Home.jsx', 'utf8');
  const GP = fs.readFileSync('./src/pages/GroupPage.jsx', 'utf8');
  const FV = fs.readFileSync('./src/components/FeedVideo.jsx', 'utf8');

  eq('Home : toerana 2', (HO.match(/dataSaver=\{dataSaver \|\| lite\}/g) || []).length, 2);
  eq('GroupPage : toerana 2', (GP.match(/dataSaver=\{dataSaver \|\| lite\}/g) || []).length, 2);
  ok('tsy misy `dataSaver={dataSaver}` sisa (Home)', !/dataSaver=\{dataSaver\}/.test(HO));
  ok('tsy misy `dataSaver={dataSaver}` sisa (GroupPage)', !/dataSaver=\{dataSaver\}/.test(GP));

  ok('GroupPage : state lite', GP.includes('const [lite, setLiteState] = useState(isLiteOn());'));
  ok('GroupPage : subscribe', GP.includes('subscribeLite(setLiteState)'));

  // Ny guard ao anaty FeedVideo dia TSY novaina — io no antony tsy misy risque
  ok('FeedVideo : guard tsy novaina', FV.includes('if (dataSaver) { setPlaying(false); return; }'));
  ok('FeedVideo : deps [dataSaver] tsy novaina', FV.includes('}, [dataSaver]);'));
}

/* ═══ C. Icône néon ══════════════════════════════════════════════════════ */
console.log('\nC) Icône haut-parleur — SVG néon');
{
  const NI = fs.readFileSync('./src/components/NeonIcons.jsx', 'utf8');
  const FV = fs.readFileSync('./src/components/FeedVideo.jsx', 'utf8');
  const HO = fs.readFileSync('./src/pages/Home.jsx', 'utf8');

  ok('NeonSpeaker exporté', /export function NeonSpeaker\(/.test(NI));
  ok('mampiasa glow() toy ny 19 hafa', /NeonSpeaker[\s\S]{0,400}style=\{glow\(color\)\}/.test(NI));
  ok('viewBox 24 mitovy amin\'ny hafa', /NeonSpeaker[\s\S]{0,300}viewBox="0 0 24 24"/.test(NI));
  ok('endrika roa (muted ?)', /NeonSpeaker[\s\S]{0,900}\{muted \?/.test(NI));

  ok('FeedVideo : import', FV.includes("import { NeonSpeaker } from './NeonIcons';"));
  ok('FeedVideo : ampiasaina', FV.includes('<NeonSpeaker size={17} muted={muted} />'));
  ok('Home : import', /import \{[^}]*NeonSpeaker[^}]*\} from '\.\.\/components\/NeonIcons';/.test(HO));
  ok('Home : ampiasaina', HO.includes('<NeonSpeaker size={17} muted={muted} />'));

  // Tsy misy emoji sisa ao amin'ny src manontolo
  const all = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = d + '/' + e.name;
      if (e.isDirectory()) walk(p);
      else if (/\.(jsx|js)$/.test(e.name)) all.push(p);
    }
  })('./src');
  const withEmoji = all.filter(p => /🔇|🔊|🔈|🔉/.test(fs.readFileSync(p, 'utf8')));
  eq('emoji haut-parleur sisa ao amin\'ny src', withEmoji, []);
}

/* ═══ D. Tsy voakasika ═══════════════════════════════════════════════════ */
console.log('\nD) Tsy voakasika — mbola voaaro');
{
  const RE = fs.readFileSync('./src/pages/Reels.jsx', 'utf8');
  ok('Reels tsy mikitika ny Lite (mila autoplay)', !RE.includes('liteMode'));
  for (const [n, p] of Object.entries({
    'Messages': './src/pages/Messages.jsx',
    'AuthContext': './src/context/AuthContext.jsx',
    'useMessages': './src/hooks/useMessages.js',
  })) ok(n + ' tsy voakasika', !fs.readFileSync(p, 'utf8').includes('liteMode'));
}

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
