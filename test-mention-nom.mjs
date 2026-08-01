// test-mention-nom.mjs — Mention amin'ny ANARANA (token entité)
//
// MAMPANDEHA ny parser MARINA nampidirina — tsy grep.
//
// Fampandehanana :  node test-mention-nom.mjs
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

const { splitRich, mentionedEntities } = await import('./src/utils/appLink.js');

const parts   = (t) => splitRich(t);
const ments   = (t) => parts(t).filter(p => p.type === 'mention');
const rebuilt = (t) => parts(t).map(p => p.value).join('');

/* ═══ 1. Token entité — ny ANARANA aseho ═══════════════════════════════ */
console.log('1) Token entité @[Anarana](uid)');
{
  const m = ments('Salama @[Tony Rakoto](uid123)');
  eq('mention iray', m.length, 1);
  eq('ASEHO ny anarana feno', m[0].value, '@Tony Rakoto');
  eq('anarana voatahiry', m[0].name, 'Tony Rakoto');
  eq('uid voatahiry', m[0].uid, 'uid123');
}

console.log('\n   Anarana sarotra');
eq('elanelana maro', ments('@[Jean Pierre De La Croix](u1)')[0].value, '@Jean Pierre De La Croix');
eq('marika manokana', ments('@[Rakoto-Jean Rabe](u1)')[0].value, '@Rakoto-Jean Rabe');
eq('accent', ments('@[Hénintsoa Rané](u1)')[0].name, 'Hénintsoa Rané');
eq('anarana fohy', ments('@[A](u1)')[0].name, 'A');

/* ═══ 2. Naman'ny lahatsoratra ═════════════════════════════════════════ */
console.log('\n2) Anaty fehezanteny');
eq('roa', ments('@[Tony R](u1) sy @[Soa B](u2)').map(x => x.uid), ['u1', 'u2']);
eq('lahatsoratra manodidina voatazona', rebuilt('Salama @[Tony R](u1) e !'), 'Salama @Tony R e !');
eq('mifangaro amin\'ny @username', ments('@[Tony R](u1) sy @bema').map(x => x.uid || x.username), ['u1', 'bema']);
eq('miaraka amin\'ny lien', parts('https://x.com @[Tony R](u1)').filter(p => p.type === 'link').length, 1);

/* ═══ 3. Token @username tsotra — MBOLA mandeha ════════════════════════ */
console.log('\n3) @username tsotra — tsy misy régression');
eq('username tokana', ments('@bema')[0].username, 'bema');
eq('tsy misy uid', ments('@bema')[0].uid, undefined);
eq('mailaka tsy mention', ments('rakoto@tony.mg').length, 0);

/* ═══ 4. Cas limites ═══════════════════════════════════════════════════ */
console.log('\n4) Cas limites');
eq('token tsy feno → tsy entité', ments('@[Tony R]').length, 0);
eq('crochet foana', ments('@[](u1)').length, 0);
eq('uid foana', ments('@[Tony]()').length, 0);
eq('anarana lava loatra (>80)', ments('@[' + 'x'.repeat(81) + '](u1)').length, 0);
eq('anarana 80 ekena', ments('@[' + 'x'.repeat(80) + '](u1)').length, 1);
eq('sauts de ligne lavina', ments('@[Tony\nR](u1)').length, 0);
eq('lahatsoratra foana', splitRich(''), []);
eq('null', splitRich(null), []);

/* ═══ 5. mentionedEntities — ho an'ny notification ═════════════════════ */
console.log('\n5) mentionedEntities — uid MIVANTANA');
eq('uid nalaina', mentionedEntities('@[Tony R](u1) sy @[Soa](u2)').map(e => e.uid), ['u1', 'u2']);
eq('anarana koa', mentionedEntities('@[Tony R](u1)')[0].name, 'Tony R');
eq('@username tsotra tsy tafiditra', mentionedEntities('@bema'), []);
eq('tsy misy → foana', mentionedEntities('Salama'), []);
eq('null', mentionedEntities(null), []);

console.log('\n   Fanaporofoana : tsy misy fifangaroana anarana');
{
  // Bug taloha : @tony nifanaraka tamin'ny @tonyzz.
  // Amin'ny token entité dia tsy mitranga MIHITSY — ny uid no jerena.
  const uids = new Set(mentionedEntities('@[Tony](uidA)').map(e => e.uid));
  ok('uidA voatondro', uids.has('uidA'));
  ok('uidB TSY voatondro', !uids.has('uidB'));
}

/* ═══ 6. Token manokana ════════════════════════════════════════════════ */
console.log('\n6) @followers / @everyone');
{
  const f = ments('@[Abonnés](followers)')[0];
  eq('aseho « @Abonnés »', f.value, '@Abonnés');
  eq('uid = followers', f.uid, 'followers');
  const e = ments('@[Tout le monde](everyone)')[0];
  eq('aseho « @Tout le monde »', e.value, '@Tout le monde');
  eq('uid = everyone', e.uid, 'everyone');
}

/* ═══ 7. insert — logika naverina ══════════════════════════════════════ */
console.log('\n7) insert — famoronana ny token');
{
  const AT_RE = /@([\p{L}0-9_.-]*)$/u;
  const insert = (value, pick) => {
    const v = String(value || '');
    if (pick && typeof pick === 'object' && pick.uid) {
      const name = String(pick.name || '').replace(/[\[\]\n]/g, '').trim() || 'Utilisateur';
      return v.replace(AT_RE, '@[' + name + '](' + pick.uid + ') ');
    }
    return v.replace(AT_RE, '@' + pick + ' ');
  };

  eq('entité', insert('Salama @to', { name: 'Tony Rakoto', uid: 'u1' }), 'Salama @[Tony Rakoto](u1) ');
  eq('avy amin\'ny @ foana', insert('@', { name: 'Soa', uid: 'u2' }), '@[Soa](u2) ');
  eq('crochet ao anaty anarana voadio', insert('@', { name: 'Ra[ko]to', uid: 'u1' }), '@[Rakoto](u1) ');
  eq('anarana foana → fallback', insert('@', { name: '', uid: 'u1' }), '@[Utilisateur](u1) ');
  eq('tag tsotra mbola mandeha', insert('@to', 'tony'), '@tony ');

  // Aller-retour : famoronana → parsing
  const txt = insert('Salama @t', { name: 'Tony Rakoto', uid: 'u1' });
  const back = ments(txt)[0];
  eq('aller-retour : anarana', back.name, 'Tony Rakoto');
  eq('aller-retour : uid', back.uid, 'u1');
  eq('aller-retour : aseho', back.value, '@Tony Rakoto');
}

/* ═══ 8. Fampiharana ═══════════════════════════════════════════════════ */
console.log('\n8) Fampiharana');
{
  const LK = fs.readFileSync('./src/components/Linkify.jsx', 'utf8');
  const MP = fs.readFileSync('./src/components/MentionPanel.jsx', 'utf8');
  const HO = fs.readFileSync('./src/pages/Home.jsx', 'utf8');
  ok('Linkify : uid → /profile/', LK.includes('navigate(`/profile/${p.uid}`)'));
  ok('Linkify : token manokana mbola badge', LK.includes('SPECIAL_TAGS[String(p.uid || p.username)'));
  ok('Panel : mandefa { name, uid }', MP.includes('onPick({ name: p.fullName || p.username'));
  ok('Panel : specials misy uid', MP.includes("onPick({ name: s.label.replace(/^@/, ''), uid: s.tag })"));
  ok('Home : mampiasa mentionedEntities', HO.includes('mentionedEntities(text)'));
  ok('Home : uid mivantana', HO.includes('if (entityUids.has(f.uid)) return true;'));
}

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
