// test-mention-nom-fix.mjs — Bug `@[object Object]` + clic commentaire
//
// Fampandehanana :  node test-mention-nom-fix.mjs
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

const HO = fs.readFileSync('./src/pages/Home.jsx', 'utf8');
const PF = fs.readFileSync('./src/pages/Profile.jsx', 'utf8');
const { splitRich } = await import('./src/utils/appLink.js');

/* ═══ ① Bug `[object Object]` ══════════════════════════════════════════ */
console.log('① Bug `@[object Object]`');
{
  // Fanaporofoana ny bug TALOHA
  const oldWay = (tag) => '@' + tag + ' ';
  eq('endrika TALOHA amin\'ny objet → BUG', oldWay({ name: 'Tony', uid: 'u1' }), '@[object Object] ');

  // Endrika VAOVAO (naverina avy amin'ny fichier)
  const mentionToken = (pick) => {
    if (pick && typeof pick === 'object' && pick.uid) {
      const name = String(pick.name || '').replace(/[\[\]\n]/g, '').trim() || 'Utilisateur';
      return '@[' + name + '](' + pick.uid + ') ';
    }
    return '@' + pick + ' ';
  };
  eq('endrika VAOVAO amin\'ny objet', mentionToken({ name: 'Tony Rakoto', uid: 'u1' }), '@[Tony Rakoto](u1) ');
  eq('tag tsotra mbola mandeha', mentionToken('bema'), '@bema ');
  eq('anarana foana → fallback', mentionToken({ name: '', uid: 'u1' }), '@[Utilisateur](u1) ');
  eq('crochet voadio', mentionToken({ name: 'Ra[ko]to', uid: 'u1' }), '@[Rakoto](u1) ');

  // Aller-retour : ny ANARANA no aseho
  const txt = 'Salama ' + mentionToken({ name: 'Tony Rakoto', uid: 'u1' });
  const m = splitRich(txt).filter(p => p.type === 'mention')[0];
  eq('aseho ny ANARANA', m.value, '@Tony Rakoto');
  eq('uid mitondra', m.uid, 'u1');
  ok('TSY « [object Object] »', !txt.includes('[object Object]'));
}

console.log('\n   Fanamarinana ao amin\'ny Home');
ok('mentionToken voafaritra', HO.includes('const mentionToken = (pick) =>'));
ok('composer mampiasa azy', HO.includes("replace(/@([\\p{L}0-9_-]*)$/u, mentionToken(tag))"));
eq('toerana roa voahitsy', (HO.match(/mentionToken\(tag\)/g) || []).length, 2);
ok('tsy misy `\'@\' + tag` sisa', !HO.includes("'@' + tag + ' '"));

/* ═══ ② Clic commentaire → PostDetail ═════════════════════════════════ */
console.log('\n② Clic commentaire → PostDetail');
ok('Home : bouton Commenter → openPost', HO.includes("onClick={() => openPost(post.id)} className='post-action-btn'"));
ok('Home : isa commentaire → openPost', HO.includes('openPost(post.id); }} style={{ fontSize:12.5'));
ok('Profile : bouton → navigate /post/', PF.includes("onClick={() => navigate(`/post/${post.id}`)} className='post-action-btn'"));
ok('Profile : isa → navigate /post/', PF.includes('navigate(`/post/${post.id}`)} /* → PostDetail */'));
ok('Profile : tsy misy toggle in-line', !PF.includes('setOpenCmt(p=>({...p,[post.id]:!p[post.id]}))'));

console.log('\n   Fizotra mitovy na aiza na aiza');
{
  const pages = { Home: HO, Profile: PF };
  for (const [n, s] of Object.entries(pages)) {
    ok(n + ' : mankany amin\'ny PostDetail', /openPost\(post\.id\)|navigate\(`\/post\/\$\{post\.id\}`\)/.test(s));
  }
}

/* ═══ ③ Tsy misy régression ═══════════════════════════════════════════ */
console.log('\n③ Tsy misy régression');
ok('MentionPanel mandefa objet', fs.readFileSync('./src/components/MentionPanel.jsx', 'utf8')
   .includes('onPick({ name: p.fullName || p.username'));
ok('useMentions.insert mandray objet', fs.readFileSync('./src/hooks/useMentions.js', 'utf8')
   .includes("if (pick && typeof pick === 'object' && pick.uid)"));
// PostDetail : ny mention dia ao anatin'ny CommentSheet izao (dingana 2)
ok('CommentSheet mampiasa mentions.insert',
   fs.readFileSync('./src/components/CommentSheet.jsx', 'utf8').includes('mentions.insert(value, tag)'));
ok('PostDetail mandefa ny hook', fs.readFileSync('./src/pages/PostDetail.jsx', 'utf8').includes('mentions={mentions}'));
for (const [n, p] of Object.entries({
  Profile: './src/pages/Profile.jsx',
  Reels:   './src/pages/Reels.jsx',
})) ok(n + ' mampiasa mentions.insert', fs.readFileSync(p, 'utf8').includes('mentions.insert('));

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
