// test-comment-thread.mjs — Logika fil commentaire (MAMPANDEHA, tsy grep)
//
// Fampandehanana :  node test-comment-thread.mjs
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

const { buildThread, sortComments, reactCount, timeOf, canEdit, canDelete } =
  await import('./src/utils/commentThread.js');

const c = (id, opt = {}) => ({
  id, uid: opt.uid || 'u1', authorName: opt.name || 'X',
  text: opt.text || 't', createdAt: opt.at || '2026-08-01T10:00:00.000Z',
  ...(opt.parentId ? { parentId: opt.parentId } : {}),
  ...(opt.reactions ? { reactions: opt.reactions } : {}),
});
const ids = (a) => a.map(x => x.id);

/* ═══ 1. Commentaire TALOHA (tsy misy parentId) ════════════════════════ */
console.log('1) Rétro-compatibilité — commentaire taloha');
{
  const list = [c('a'), c('b'), c('d')];
  const t = buildThread(list, 'old');
  eq('rehetra lasa fototra', ids(t.roots), ['a', 'b', 'd']);
  eq('tsy misy valiny', t.repliesOf.size, 0);
  eq('total', t.total, 3);
}

/* ═══ 2. Fil ═══════════════════════════════════════════════════════════ */
console.log('\n2) Fil de réponses');
{
  const list = [
    c('a', { at: '2026-08-01T10:00:00Z' }),
    c('r1', { parentId: 'a', at: '2026-08-01T10:05:00Z' }),
    c('r2', { parentId: 'a', at: '2026-08-01T10:02:00Z' }),
    c('b', { at: '2026-08-01T11:00:00Z' }),
  ];
  const t = buildThread(list, 'old');
  eq('fototra roa', ids(t.roots), ['a', 'b']);
  eq('valiny alahatra araka ny DATY', ids(t.repliesOf.get('a')), ['r2', 'r1']);
  eq('total mirakitra ny valiny', t.total, 4);
}

/* ═══ 3. FIAROVANA — données simba ═════════════════════════════════════ */
console.log('\n3) Fiarovana — données simba');
{
  // Ray tsy misy → fototra (tsy very)
  let t = buildThread([c('a'), c('orphan', { parentId: 'zzz' })], 'old');
  eq('ray tsy misy → fototra', ids(t.roots), ['a', 'orphan']);
  eq('tsy misy very', t.total, 2);

  // Boucle a→b→a
  t = buildThread([c('a', { parentId: 'b' }), c('b', { parentId: 'a' })], 'old');
  eq('boucle tapahina — samy fototra', t.roots.length, 2);
  eq('tsy misy infinite loop', t.total, 2);

  // Auto-référence
  t = buildThread([c('a', { parentId: 'a' })], 'old');
  eq('a→a → fototra', ids(t.roots), ['a']);

  // Sanda maloto
  t = buildThread([null, undefined, { text: 'tsy misy id' }, c('ok')], 'old');
  eq('objet tsy misy id lavina', ids(t.roots), ['ok']);
  eq('null / undefined lavina', t.total, 1);

  eq('tabilao foana', buildThread([], 'top').roots, []);
  eq('null', buildThread(null, 'top').roots, []);
  eq('tsy tabilao', buildThread('abc', 'top').roots, []);
}

/* ═══ 4. Fandaharana ═══════════════════════════════════════════════════ */
console.log('\n4) Fandaharana');
{
  const list = [
    c('vieux',  { at: '2026-08-01T08:00:00Z' }),
    c('populo', { at: '2026-08-01T09:00:00Z', reactions: { x: '👍', y: '❤️', z: '😂' } }),
    c('recent', { at: '2026-08-01T12:00:00Z' }),
  ];
  eq('« Plus pertinents » : réaction be aloha', ids(buildThread(list, 'top').roots), ['populo', 'vieux', 'recent']);
  eq('« Plus récents »', ids(buildThread(list, 'recent').roots), ['recent', 'populo', 'vieux']);
  eq('« Plus anciens »', ids(buildThread(list, 'old').roots), ['vieux', 'populo', 'recent']);
}

console.log('\n   Départage : valiny be indrindra');
{
  const list = [
    c('peu',  { at: '2026-08-01T08:00:00Z' }),
    c('bcp',  { at: '2026-08-01T09:00:00Z' }),
    c('r1', { parentId: 'bcp' }), c('r2', { parentId: 'bcp' }),
  ];
  eq('valiny be → aloha', ids(buildThread(list, 'top').roots), ['bcp', 'peu']);
}

/* ═══ 5. Daty — endrika maro ═══════════════════════════════════════════ */
console.log('\n5) Daty — endrika rehetra');
eq('ISO string', timeOf({ createdAt: '2026-08-01T10:00:00.000Z' }), Date.parse('2026-08-01T10:00:00.000Z'));
eq('nombre', timeOf({ createdAt: 1785000000000 }), 1785000000000);
eq('Firestore Timestamp (seconds)', timeOf({ createdAt: { seconds: 1785000000 } }), 1785000000000);
eq('Firestore toDate()', timeOf({ createdAt: { toDate: () => new Date(1785000000000) } }), 1785000000000);
eq('tsy misy daty', timeOf({}), 0);
eq('daty simba', timeOf({ createdAt: 'abc' }), 0);
eq('null', timeOf(null), 0);

/* ═══ 6. Réaction ══════════════════════════════════════════════════════ */
console.log('\n6) Isan\'ny réaction');
eq('telo', reactCount({ reactions: { a: '👍', b: '❤️', c: '😂' } }), 3);
eq('foana', reactCount({ reactions: {} }), 0);
eq('tsy misy', reactCount({}), 0);
eq('null', reactCount(null), 0);

/* ═══ 7. Alalana ═══════════════════════════════════════════════════════ */
console.log('\n7) Modifier / Supprimer');
eq('ny anao → azo ovaina', canEdit({ uid: 'me' }, 'me'), true);
eq('an\'olona → tsia', canEdit({ uid: 'other' }, 'me'), false);
eq('ny anao → azo fafana', canDelete({ uid: 'me' }, 'me', 'other'), true);
eq('tompon\'ny publication → azo fafana', canDelete({ uid: 'other' }, 'me', 'me'), true);
eq('tsy anao tsy tompo → tsia', canDelete({ uid: 'other' }, 'me', 'x'), false);
eq('null', canDelete(null, 'me', 'me'), false);

/* ═══ 8. Composant ═════════════════════════════════════════════════════ */
console.log('\n8) CommentSheet — endrika sy fitsipika');
{
  const S = fs.readFileSync('./src/components/CommentSheet.jsx', 'utf8');
  ok('portal (tsy voatapaky ny overflow)', S.includes('createPortal('));
  ok('88 % ny écran', S.includes("height: '88vh'"));
  ok('bulle #F0F2F5 r16', S.includes('background: C.bulle, borderRadius: 16'));
  ok('appui long → menu', S.includes('setTimeout(() => {') && S.includes('setMenu(true)'));
  ok('Modifier/Supprimer TSY ao anaty andalana', !S.includes('HiPencil') && !S.includes('HiTrash'));
  ok('ligne : daty · J\'aime · Répondre', S.includes("J'aime") && S.includes('Répondre'));
  ok('pastille manidina ankavanana', S.includes("marginLeft: 'auto'"));
  ok('valiny mitanila 40 px', S.includes('marginLeft: isReply ? 40 : 0'));
  ok('avatar valiny 26 px', S.includes('isReply ? 26 : 32'));
  ok('« Voir N autres réponses »', S.includes('Voir {rest} autre'));
  ok('valiny mipetaka amin\'ny FOTOTRA', S.includes('onReply && onReply(c, r)'));
  ok('tri telo', S.includes("'Plus pertinents'") && S.includes("'Plus récents'") && S.includes("'Plus anciens'"));
  ok('réaction mitovy amin\'ny app', S.includes("['👍', '❤️', '😂', '😮', '😢', '😡']"));
  ok('magenta amin\'ny bokotra alefa', S.includes("linear-gradient(135deg,#FF6FA5,' + C.rose"));
  ok('MentionPanel voarohy', S.includes('<MentionPanel'));
  ok('clavier voahaja', S.includes('useKeyboardInset'));

  // ⚠️ Tsy voarohy amin'ny pejy amin'ity dingana ity
  const pages = ['Home', 'PostDetail', 'Profile', 'Reels'];
  const used = pages.filter(p => fs.readFileSync('./src/pages/' + p + '.jsx', 'utf8').includes('CommentSheet'));
  eq('TSY VOAROHY (dingana 1)', used, []);
}

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
