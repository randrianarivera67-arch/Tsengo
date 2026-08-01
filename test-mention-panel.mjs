// test-mention-panel.mjs — Panneau portal + clavier
//
// Fampandehanana :  node test-mention-panel.mjs
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

const MP = fs.readFileSync('./src/components/MentionPanel.jsx', 'utf8');
const KB = fs.readFileSync('./src/hooks/useKeyboardInset.js', 'utf8');
const HO = fs.readFileSync('./src/pages/Home.jsx', 'utf8');
const LA = fs.readFileSync('./src/components/Layout.jsx', 'utf8');

/* ═══ 1. PORTAL — io no manafoana ny olana ═════════════════════════════ */
console.log('1) Portal — mivoaka amin\'ny ancêtre rehetra');
ok('createPortal ampiasaina', MP.includes('createPortal('));
ok('mankany amin\'ny document.body', MP.includes('document.body'));
ok('position fixed', MP.includes("position: 'fixed', left: 0, right: 0"));
ok('tsy misy position absolute', !MP.includes("position: 'absolute'"));
ok('zIndex avo', MP.includes('zIndex: 9001'));

console.log('\n   Dropdown taloha voaesotra');
// ⚠️ Ny `bottom:'110%'` sisa (and. 2660) dia ny picker RÉACTION commentaire,
// tsy ny mention — tsy voakasik'ity patch ity.
ok('dropdown mention taloha voaesotra', !HO.includes("const opts = mentionFriends.filter"));
ok('picker réaction tsy voakasika', HO.includes('cmtReactionPicker'));
eq('MentionPanel ampiasaina indroa', (HO.match(/<MentionPanel/g) || []).length, 2);

/* ═══ 2. Clavier ═══════════════════════════════════════════════════════ */
console.log('\n2) Refesina ny clavier');
ok('visualViewport ampiasaina', KB.includes('window.visualViewport'));
ok('resize + scroll écoutés', KB.includes("addEventListener('resize'") && KB.includes("addEventListener('scroll'"));
ok('cleanup', KB.includes("removeEventListener('resize'"));
ok('fetra 80 px (barre ≠ clavier)', KB.includes('gap > 80'));
ok('navigateur tranainy → 0', KB.includes('if (!vv) return;'));

console.log('\n   Logika naverina');
{
  const calc = (innerH, vvH, offset = 0) => {
    const gap = Math.max(0, innerH - vvH - offset);
    return gap > 80 ? Math.round(gap) : 0;
  };
  eq('clavier mikatona → 0', calc(800, 800), 0);
  eq('clavier misokatra 320 → 320', calc(800, 480), 320);
  eq('barre navigateur 60 → 0', calc(800, 740), 0);
  eq('offset voahaja', calc(800, 480, 20), 300);
  eq('sanda ratsy → 0', calc(800, 900), 0);
}

/* ═══ 3. Toerana : eo AMBONIN'ny clavier ═══════════════════════════════ */
console.log('\n3) Toerana');
ok('bottom = haavon\'ny clavier', MP.includes('bottom: kb'));
ok('maxHeight voafetra', MP.includes("maxHeight: 'min(46vh, 420px)'"));
ok('scroll anatiny', MP.includes("overflowY: 'auto'"));

/* ═══ 4. Endrika Facebook ══════════════════════════════════════════════ */
console.log('\n4) Endrika Facebook');
ok('avatar 44 px', MP.includes('width: 44, height: 44'));
ok('anarana 15/600', MP.includes('fontSize: 15, fontWeight: 600'));
ok('sous-titre 12 gris', MP.includes("fontSize: 12, color: '#65676B'"));
ok('@followers', MP.includes("label: '@followers'"));
ok('@Tout le monde', MP.includes("label: '@Tout le monde'"));
ok('fanazavana notification', MP.includes('peuvent recevoir des notifications'));
ok('icône groupe ho an\'ny specials', MP.includes('function GroupIcon()'));
ok('30 olona aseho', MP.includes('.slice(0, 30)'));

/* ═══ 5. Filtre ════════════════════════════════════════════════════════ */
console.log('\n5) Filtre (logika naverina)');
{
  const SPECIALS = [{ tag: 'followers' }, { tag: 'everyone' }];
  const filt = (q, people, showSpecials) => {
    const s = showSpecials ? SPECIALS.filter(x => x.tag.startsWith(q)) : [];
    const l = people.filter(p => (p.fullName || '').toLowerCase().includes(q)
      || (p.username || '').toLowerCase().includes(q)).slice(0, 30);
    return { s: s.length, l: l.map(x => x.uid) };
  };
  const PP = [
    { uid: 'a', fullName: 'Tony Rakoto', username: 'tony' },
    { uid: 'b', fullName: 'Soa Rabe', username: 'soa' },
  ];
  eq('@ foana → rehetra', filt('', PP, true), { s: 2, l: ['a', 'b'] });
  eq('@to → tony', filt('to', PP, true), { s: 0, l: ['a'] });
  eq('@fo → followers ihany', filt('fo', PP, true), { s: 1, l: [] });
  eq('tsy tompo → tsy misy specials', filt('', PP, false), { s: 0, l: ['a', 'b'] });
  eq('tsy mifanaraka → foana', filt('zzz', PP, true), { s: 0, l: [] });
}

/* ═══ 6. Navbar ════════════════════════════════════════════════════════ */
console.log('\n6) Dock miafina rehefa miakatra ny clavier');
ok('useKeyboardInset ao amin\'ny Layout', LA.includes('const kbInset = useKeyboardInset();'));
ok('dock miafina', LA.includes("style={kbInset > 0 ? { display: 'none' } : undefined}"));
ok('miverina rehefa mikatona', LA.includes(': undefined}'));

/* ═══ 7. Tsy misy régression ═══════════════════════════════════════════ */
console.log('\n7) Tsy misy régression');
ok('loadMentionPeople mbola ao', HO.includes('async function loadMentionPeople()'));
ok('composer mbola manetsika', HO.includes("setMentionQuery({ postId: '__composer__'"));
ok('commentaire mbola manetsika', HO.includes('setMentionQuery({ postId: post.id'));
ok('specials ho an\'ny tompo ihany', HO.includes('showSpecials={post.uid === currentUser.uid}'));
ok('scroll tsy manakatona', !/const close = \(\) => \{[^}]*setMentionQuery/.test(HO));

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
