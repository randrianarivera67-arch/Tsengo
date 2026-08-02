// test-comment-sheet-2.mjs — Dingana 2 : PostDetail
//
// Fampandehanana :  node test-comment-sheet-2.mjs
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

const PD = fs.readFileSync('./src/pages/PostDetail.jsx', 'utf8');
const { buildThread } = await import('./src/utils/commentThread.js');

/* ═══ 1. Fifandraisana ═════════════════════════════════════════════════ */
console.log('1) Fifandraisana');
ok('CommentSheet importé', PD.includes("import CommentSheet from '../components/CommentSheet'"));
eq('ampiasaina indray mandeha', (PD.match(/<CommentSheet/g) || []).length, 1);
// Misokatra IHANY raha avy amin'ny bokotra commentaire (?c=1) — fanovana nangatahina
ok('misokatra araka ny marika ?c=1', PD.includes("get('c') === '1'"));
ok('tsy misokatra amin\'ny clic sary/lahatsoratra', !PD.includes('useState(true);   // misokatra ho azy'));
ok('open miankina amin\'ny post', PD.includes('open={sheetOpen && !!post}'));

console.log('\n   Props');
for (const p of ['post={post}', 'comments={post?.comments || []}', 'meUid={currentUser?.uid}',
                 'value={commentText}', 'onChange={setCmtText}', 'onSend={addComment}',
                 'replyTo={replyTo}', 'mentions={mentions}']) {
  ok(p, PD.includes(p));
}

/* ═══ 2. replyTo : objet ═══════════════════════════════════════════════ */
console.log('\n2) replyTo — objet, tsy chaîne');
ok('commentaire mazava', PD.includes("{ id, authorName } — ilaina ho an'ny parentId"));
ok('onReply mandefa { id, authorName }', PD.includes('setReplyTo({ id: root.id, authorName: root.authorName })'));
ok('parentId ao amin\'ny commentaire', PD.includes('...(replyTo?.id ? { parentId: replyTo.id } : {})'));
ok('@Anarana taloha VOAESOTRA', !PD.includes('`@${rt} ${commentText}`'));
ok('tsy misy `replyTo?`Répondre à ${replyTo}`', !PD.includes('`Répondre à ${replyTo}...`'));

/* ═══ 3. Fil — logika naverina ═════════════════════════════════════════ */
console.log('\n3) Fil — fitondrana marina');
{
  const mk = (id, parentId, at) => ({
    id, uid: 'u', authorName: 'A', text: 't',
    createdAt: at, ...(parentId ? { parentId } : {}),
  });

  // Valiny amin'ny commentaire fototra
  let t = buildThread([
    mk('c1', null, '2026-08-01T10:00:00Z'),
    mk('r1', 'c1', '2026-08-01T10:05:00Z'),
  ], 'old');
  eq('fototra iray', t.roots.map(x => x.id), ['c1']);
  eq('valiny voarohy', (t.repliesOf.get('c1') || []).map(x => x.id), ['r1']);

  // Valiny amin'ny VALINY → mipetaka amin'ny fototra (fomba Facebook)
  // (ny UI dia mandefa foana ny `root`, ka `parentId = c1`)
  t = buildThread([
    mk('c1', null, '2026-08-01T10:00:00Z'),
    mk('r1', 'c1', '2026-08-01T10:05:00Z'),
    mk('r2', 'c1', '2026-08-01T10:09:00Z'),
  ], 'old');
  eq('tsy misy fil lalina noho ny 2', t.roots.length, 1);
  eq('valiny roa mitovy fototra', (t.repliesOf.get('c1') || []).map(x => x.id), ['r1', 'r2']);

  // Commentaire TALOHA (tsy misy parentId) mifangaro amin'ny vaovao
  t = buildThread([
    mk('old1', null, '2026-07-01T10:00:00Z'),
    mk('new1', null, '2026-08-01T10:00:00Z'),
    mk('rep',  'new1', '2026-08-01T10:02:00Z'),
  ], 'old');
  eq('taloha mbola fototra', t.roots.map(x => x.id), ['old1', 'new1']);
  eq('total marina', t.total, 3);
}

/* ═══ 4. Bokotra fanokafana ════════════════════════════════════════════ */
console.log('\n4) Bokotra fanokafana');
ok('misy', PD.includes('onClick={() => setSheetOpen(true)}'));
ok('maneho ny isa', PD.includes('Voir les ${post.comments.length} commentaires'));
ok('hafatra raha foana', PD.includes("'Écrire un commentaire…'"));

/* ═══ 5. Tsy voakasika ═════════════════════════════════════════════════ */
console.log('\n5) Tsy voakasika');
ok('submitViewerComment (MediaViewer) tsy voakitika', PD.includes('async function submitViewerComment(text)'));
ok('reactToCmt mbola ao', PD.includes('async function reactToCmt('));
ok('deleteCmt mbola ao', PD.includes('async function deleteCmt('));
ok('saveEditCmt mbola ao', PD.includes('async function saveEditCmt('));
ok('input média mbola ao', PD.includes('ref={cPhotoRef}') && PD.includes('ref={cVideoRef}'));

console.log('\n   Sehatra hafa tsy kitihina');
for (const p of ['Home', 'Profile', 'Reels']) {
  ok(p + '.jsx tsy mampiasa CommentSheet',
     !fs.readFileSync('./src/pages/' + p + '.jsx', 'utf8').includes('CommentSheet'));
}

/* ═══ 6. Appui long réaction (dingana 3) ═══════════════════════════════ */
console.log('\n6) Appui long — réaction');
{
  const CS = fs.readFileSync('./src/components/CommentSheet.jsx', 'utf8');
  ok('ref appui long', CS.includes('const likePressRef = useRef(null);'));
  ok('marika long/fohy', CS.includes('const likeLongRef  = useRef(false);'));
  ok('480 ms', CS.includes('likeLongRef.current = true; openPicker(); }, 480)'));
  ok('appui long tsy manao réaction koa', CS.includes('if (likeLongRef.current) { likeLongRef.current = false; return; }'));
  ok('tsindry fohy → réaction', CS.includes("onReact(c, mine || '\ud83d\udc4d')"));
  eq('cleanup 3 toerana (up/leave/move)', (CS.match(/clearTimeout\(likePressRef\.current\)/g) || []).length, 3);
  ok('« Je n\'aime plus » raha efa nanao', CS.includes("mine ? 'Je n\\'aime plus'"));
  ok('picker mikatona amin\'ny ivelany', CS.includes('onClick={() => setPicker(false)}'));
  ok('connecteur valiny', CS.includes('borderBottomLeftRadius: 10'));
}

console.log('\n   Logika appui long (naverina)');
{
  const sim = () => {
    let picker = false, long = false, react = null;
    return {
      longFire() { long = true; picker = true; },
      click(mine) { if (long) { long = false; return; } react = mine || '\ud83d\udc4d'; },
      get state() { return { picker, react }; },
    };
  };
  let a = sim(); a.click(null);
  eq('tsindry fohy → \ud83d\udc4d', a.state, { picker: false, react: '\ud83d\udc4d' });
  let b = sim(); b.longFire(); b.click(null);
  eq('appui long → panneau IHANY', b.state, { picker: true, react: null });
  let d = sim(); d.click('\u2764\ufe0f');
  eq('efa nanao \u2764\ufe0f → manala azy', d.state, { picker: false, react: '\u2764\ufe0f' });
}

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');

process.exit(fail ? 1 : 0);
