// test-navbar.mjs — JEJO → ▶ clay 3D rose
//
// Fampandehanana :  node test-navbar.mjs
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

const L = fs.readFileSync('./src/components/Layout.jsx', 'utf8');

/* ═══ 1. Icône vaovao ══════════════════════════════════════════════════ */
console.log('1) ▶ clay 3D rose');
ok('karazana « play » ampiana', L.includes("type === 'play'"));
ok('ao anatin\'ny ClayNavIcon efa misy', /function ClayNavIcon[^]{0,3000}type === 'play'/.test(L));
ok('sela boribory', /type === 'play'[^]{0,300}<circle cx="32" cy="32" r="22"/.test(L));
ok('▶ fotsy', /type === 'play'[^]{0,500}fill="#fff"/.test(L));
ok('reflet toy ny hafa', /type === 'play'[^]{0,700}<ellipse[^]{0,120}opacity="0.3"/.test(L));

console.log('\n   Loko rose — karazana fahatelo');
ok('rose voafaritra mazava', L.includes("const rose = color === '#FF2D8D';"));
ok('l rose', L.includes("const l = rose ? '#FF9CC9' : blue ? '#7CB8FF' : '#FFE08A';"));
ok('m rose', L.includes("const m = rose ? '#FF3E97' : blue ? '#2E8BFF' : '#F5C518';"));
ok('d rose', L.includes("const d = rose ? '#DA0F68' : blue ? '#1667D8' : '#D69A00';"));

console.log('\n   Logika loko (naverina)');
{
  const pick = (color) => {
    const blue = color === '#1877F2', rose = color === '#FF2D8D';
    return {
      l: rose ? '#FF9CC9' : blue ? '#7CB8FF' : '#FFE08A',
      m: rose ? '#FF3E97' : blue ? '#2E8BFF' : '#F5C518',
      d: rose ? '#DA0F68' : blue ? '#1667D8' : '#D69A00',
    };
  };
  eq('manga tsy voakasika', pick('#1877F2'), { l: '#7CB8FF', m: '#2E8BFF', d: '#1667D8' });
  eq('volamena tsy voakasika', pick('#F5C518'), { l: '#FFE08A', m: '#F5C518', d: '#D69A00' });
  eq('rose vaovao', pick('#FF2D8D'), { l: '#FF9CC9', m: '#FF3E97', d: '#DA0F68' });
  eq('loko tsy fantatra → volamena (toy ny teo aloha)', pick('#000'), { l: '#FFE08A', m: '#F5C518', d: '#D69A00' });
}

/* ═══ 2. Config ════════════════════════════════════════════════════════ */
console.log('\n2) Configuration');
ok('Jejo mampiasa play + rose', L.includes("{ path: '/reels',      icon: 'play',   color: '#FF2D8D', label: 'Jejo' },"));
ok('isJejo voaesotra tanteraka', !L.includes('isJejo'));
ok('JejoIcon tsy antsoina intsony', !L.includes('<JejoIcon'));
ok('JejoIcon tazonina ao amin\'ny fichier', L.includes('function JejoIcon'));
ok('label aseho toy ny hafa', L.includes('<span className="dock-label"'));

console.log('\n   Lalana sy fihetsika tsy voakasika');
ok("lalana /reels", L.includes("path: '/reels'"));
for (const p of ["path: '/'", "path: '/friends'", "path: '/messages'"]) ok(p, L.includes(p));
ok('badge tsy voakasika', L.includes('{badge > 0 && <span className="notif-badge"'));
ok('navigate tsy voakasika', L.includes('navigate(path, { replace: isLateralTabSwitch, state: navState })'));

/* ═══ 3. Icône hafa — tsy simba ════════════════════════════════════════ */
console.log('\n3) Icône hafa tsy simba');
for (const t of ['home', 'amis', 'plane', 'profil']) {
  ok(t, L.includes("type === '" + t + "'"));
}
ok('HiPlay importé', /import \{[^}]*\bHiPlay\b[^}]*\} from 'react-icons\/hi'/.test(L));
ok('import tsy simba (tsy misy « ,, »)', !L.includes(',,'));
ok('FilledIcon mandray play', L.includes("icon === 'play' ? HiPlay : HiUser"));

console.log('\n   Sela active');
ok('rose ao amin\'ny gradient active', L.includes("color === '#FF2D8D' ? '#FF7DC0'"));
ok('manga tsy voakasika', L.includes("color === '#1877F2' ? '#4E9BFF'"));

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
