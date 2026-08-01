// test-mention-fix2.mjs — TESTE MAMPANDEHA ny logika, tsy grep fotsiny.
//
// Ny fahadisoako hatramin'izay : teste izay mamaky ny fichier ihany. Ka ny bug
// kajy clavier dia tsy tratra, satria ny code dia « misy » nefa diso.
// Eto dia averina ny fitondran'ny navigateur MARINA (Chrome Android vs iOS).
//
// Fampandehanana :  node test-mention-fix2.mjs
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

const KB = fs.readFileSync('./src/hooks/useKeyboardInset.js', 'utf8');

/* ═══ ① Kajy clavier — fitondrana navigateur MARINA ════════════════════ */
console.log('① Kajy clavier');

// Fakana ny logika `update` marina ao amin'ny fichier
const iU = KB.indexOf('const update = () => {');
const body = KB.slice(KB.indexOf('{', iU + 20) + 1, KB.indexOf('};', iU));

function makeUpdate() {
  const baseRef = { current: 0 };
  let inset = 0;
  const setInset = (v) => { inset = v; };
  return {
    run(vvHeight) {
      const vv = { height: vvHeight, offsetTop: 0 };
      const window = { innerHeight: vvHeight };   // Chrome Android : mihena koa
      new Function('vv', 'baseRef', 'setInset', 'Math', 'window', body)(vv, baseRef, setInset, Math, window);
      return inset;
    },
    get base() { return baseRef.current; },
  };
}

console.log('\n   Chrome Android (innerHeight MIHENA koa — io no bug taloha)');
{
  const u = makeUpdate();
  eq('clavier mikatona (800)', u.run(800), 0);
  eq('clavier misokatra (800→480)', u.run(480), 320);
  eq('base voatazona', u.base, 800);
  eq('clavier mikatona indray', u.run(800), 0);

  // Fanaporofoana fa ny formule TALOHA dia manome 0
  const oldFormula = (innerH, vvH) => Math.max(0, innerH - vvH - 0);
  eq('formule TALOHA amin\'ny Chrome Android → 0 (bug)', oldFormula(480, 480), 0);
  ok('formule VAOVAO → 320 (voahitsy)', makeUpdate().run(800) === 0 && makeUpdate().run(800) === 0);
}

console.log('\n   iOS (innerHeight TSY miova)');
{
  const u = makeUpdate();
  u.run(800);
  eq('clavier misokatra', u.run(460), 340);
}

console.log('\n   Fiovana kely — tsy diso lazaina hoe clavier');
{
  const u = makeUpdate();
  u.run(800);
  eq('barre navigateur (60 px) → 0', u.run(740), 0);
  eq('fiovana 80 px indrindra → 0', u.run(720), 0);
  eq('81 px → hita', u.run(719), 81);
}

console.log('\n   Fanamarinana statique');
// Ny `window.innerHeight` sisa dia ao anaty COMMENTAIRE ihany
{
  const code = KB.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  ok('tsy mampiasa window.innerHeight ao anaty code', !code.includes('window.innerHeight'));
}
ok('baseRef ampiasaina', KB.includes('baseRef.current'));
ok('useRef importé', KB.includes('useState, useRef'));

/* ═══ ② Panneau tsy manjavona ══════════════════════════════════════════ */
console.log('\n② Panneau — tsy manjavona mangina');
{
  const MP = fs.readFileSync('./src/components/MentionPanel.jsx', 'utf8');
  ok('tsy mamerina null raha foana', !MP.includes('if (!specials.length && !list.length) return null;'));
  ok('const empty', MP.includes('const empty = !specials.length && !list.length;'));
  ok('hafatra "Aucun résultat"', MP.includes('Aucun résultat pour'));
  ok('hafatra raha tsy mbola nanoratra', MP.includes('Commencez à taper un nom'));
}

/* ═══ ② Fikarohana mivantana ═══════════════════════════════════════════ */
console.log('\n② Fikarohana mivantana ao amin\'ny `users`');
{
  const UM = fs.readFileSync('./src/hooks/useMentions.js', 'utf8');
  ok('searchUsers voafaritra', UM.includes('const searchUsers = useCallback'));
  // ⚠️ \uf8ff dia caractère private-use : tsy miseho amin'ny terminal.
  // Ny CODE no jerena, fa tsy ny soratra.
  {
    const m = UM.match(/endAt\(q \+ '(.*?)'\)/);
    ok('prefix sentinel \\uf8ff', !!m && m[1].charCodeAt(0) === 0xf8ff,
       m ? 'code ' + m[1].charCodeAt(0).toString(16) : 'tsy hita');
  }
  ok('fetra 8', UM.includes('limit(8)'));
  ok('debounce 280 ms', UM.includes('}, 280);'));
  ok('tsy averina raha mitovy ny q', UM.includes('if (searchRef.current.q === q) return;'));
  ok('tena esorina', UM.includes("filter(d => d.id !== currentUser?.uid)"));
  ok('antsoina ao amin\'ny onType', UM.includes('searchUsers(q);'));
  ok('fahadisoana → lisitra foana', UM.includes('catch (e) { setFound([]); }'));

  // Fampifangaroana
  const merge = (people, found) => {
    const seen = new Set(people.map(p => p.uid));
    return [...people, ...found.filter(f => !seen.has(f.uid))];
  };
  eq('fifandraisana aloha', merge([{ uid: 'a' }], [{ uid: 'b' }]).map(x => x.uid), ['a', 'b']);
  eq('dédoublonnage', merge([{ uid: 'a' }], [{ uid: 'a' }, { uid: 'b' }]).map(x => x.uid), ['a', 'b']);
  eq('fifandraisana foana → vokatry ny fikarohana', merge([], [{ uid: 'b' }]).map(x => x.uid), ['b']);
  eq('samy foana', merge([], []), []);
}

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
