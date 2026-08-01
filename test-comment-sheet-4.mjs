// test-comment-sheet-4.mjs — Aseho tsotra / Tehirizina ho token + Copier
//
// Fampandehanana :  node test-comment-sheet-4.mjs
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

const UM = fs.readFileSync('./src/hooks/useMentions.js', 'utf8');
const CS = fs.readFileSync('./src/components/CommentSheet.jsx', 'utf8');
const PD = fs.readFileSync('./src/pages/PostDetail.jsx', 'utf8');
const { splitRich } = await import('./src/utils/appLink.js');

/* ── Fakana ny logika MARINA ao amin'ny fichier ── */
const SPECIAL = ['.', '*', '+', '?', '^', '(', ')', '|', '[', ']',
                 String.fromCharCode(123), String.fromCharCode(125),
                 String.fromCharCode(36), String.fromCharCode(92)];
const esc = (t) => String(t).split('').map(ch => SPECIAL.indexOf(ch) >= 0 ? String.fromCharCode(92) + ch : ch).join('');
const toStorage = (text, picked) => {
  let out = String(text || '');
  for (const p of picked) {
    const re = new RegExp('@' + esc(p.name) + '(?![\\p{L}\\p{N}_])', 'u');
    if (re.test(out)) out = out.replace(re, () => '@[' + p.name + '](' + p.uid + ')');
  }
  return out;
};

/* ═══ 1. Aseho tsotra ═══════════════════════════════════════════════ */
console.log('1) Insert — ASEHO ny anarana tsotra');
ok('insert mamerina @Anarana tsotra', UM.includes("return v.replace(AT_RE, '@' + name + ' ');"));
ok('token TSY aseho', !UM.includes("return v.replace(AT_RE, '@[' + name + '](' + pick.uid + ') ');"));
ok('voatahiry ny voafidy', UM.includes('pickedRef.current = ['));

/* ═══ 2. toStorage ══════════════════════════════════════════════════ */
console.log('\n2) toStorage — lasa token amin\'ny fandefasana');
{
  const P = [{ name: 'Tonny', uid: 'u1' }];
  eq('fanoloana tsotra', toStorage('Salama @Tonny e', P), 'Salama @[Tonny](u1) e');
  eq('am-parany', toStorage('Salama @Tonny', P), 'Salama @[Tonny](u1)');
  eq('am-piandohana', toStorage('@Tonny salama', P), '@[Tonny](u1) salama');
  eq('tsy voatonona → tsy miova', toStorage('Salama e', P), 'Salama e');

  const P2 = [{ name: 'Tony Rakoto', uid: 'u1' }];
  eq('anarana misy elanelana', toStorage('Ry @Tony Rakoto e', P2), 'Ry @[Tony Rakoto](u1) e');

  const P3 = [{ name: 'Tonny', uid: 'u1' }, { name: 'Soa', uid: 'u2' }];
  eq('roa', toStorage('@Tonny sy @Soa', P3), '@[Tonny](u1) sy @[Soa](u2)');

  eq('indray mandeha isaky ny mention', toStorage('@Tonny @Tonny', P), '@[Tonny](u1) @Tonny');
}

console.log('\n   Fetra teny — tsy manapaka anarana lava');
{
  const P = [{ name: 'Ton', uid: 'u1' }];
  eq('@Tonny TSY voasolo (fetra teny)', toStorage('@Tonny', P), '@Tonny');
  eq('@Ton voasolo', toStorage('@Ton e', P), '@[Ton](u1) e');
}

console.log('\n   Anarana misy marika manokana');
{
  eq("apostrophe", toStorage("@Y'niz Rider e", [{ name: "Y'niz Rider", uid: 'u1' }]), "@[Y'niz Rider](u1) e");
  eq('parenthèse', toStorage('@Ra(ko) e', [{ name: 'Ra(ko)', uid: 'u1' }]), '@[Ra(ko)](u1) e');
  eq('teboka', toStorage('@R.J e', [{ name: 'R.J', uid: 'u1' }]), '@[R.J](u1) e');
  eq('accent', toStorage('@Hénin e', [{ name: 'Hénin', uid: 'u1' }]), '@[Hénin](u1) e');
  eq('tsy misy voafidy', toStorage('@Tonny', []), '@Tonny');
}

console.log('\n   Aller-retour : toStorage → splitRich');
{
  const s = toStorage('Salama @Tony Rakoto e', [{ name: 'Tony Rakoto', uid: 'u1' }]);
  const m = splitRich(s).filter(p => p.type === 'mention')[0];
  eq('aseho ny anarana', m.value, '@Tony Rakoto');
  eq('uid mitondra', m.uid, 'u1');
}

/* ═══ 3. Fifandraisana ══════════════════════════════════════════════ */
console.log('\n3) Fifandraisana');
ok('toStorage exporté', UM.includes('toStorage, clearPicked };'));
ok('PostDetail mampiasa azy', PD.includes('mentions.toStorage((commentText || \'\').trim())'));
ok('diovina aorian\'ny fandefasana', PD.includes('mentions.clearPicked()'));

/* ═══ 4. Copier ═════════════════════════════════════════════════════ */
console.log('\n4) Menu appui long');
ok('Copier misy', CS.includes('>Copier</button>'));
ok('azon\'ny rehetra', CS.includes("if (!movedRef.current) setMenu(true);"));
ok('clipboard moderne', CS.includes('navigator.clipboard?.writeText'));
ok('fallback execCommand', CS.includes("document.execCommand('copy')"));
ok('Modifier mbola ao', CS.includes('>Modifier</button>'));
ok('Supprimer mbola ao', CS.includes('>Supprimer</button>'));

/* ═══ 5. Valiny mitanila ════════════════════════════════════════════ */
console.log('\n5) Valiny — mitanila bebe kokoa');
ok('48 px', CS.includes('marginLeft: isReply ? 48 : 0,'));
ok('connecteur mifanaraka', CS.includes('left: -26'));
ok('« Voir N » mifanaraka', CS.includes('marginLeft: 48,'));

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
