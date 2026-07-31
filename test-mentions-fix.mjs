// test-mentions-fix.mjs — Fanamarinana ny bug 4 nahatonga ny panneau tsy hiseho
//
// Fampandehanana :  node test-mentions-fix.mjs
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

/* ═══ ① Loharano : tsy namana ihany ════════════════════════════════════ */
console.log('① Loharano — tsy mitaky namana intsony');
ok('loadMentionPeople misolo', HO.includes('async function loadMentionPeople()'));
ok('loadMentionFriends voaesotra', !HO.includes('loadMentionFriends'));
ok('TSY miverina raha tsy misy namana', !HO.includes("!userProfile?.friends?.length) return"));
ok('friends + followers + following', /friends[^]{0,120}followers[^]{0,120}following/.test(HO));
ok('dédoublonnage', HO.includes('[...new Set(['));
ok('tena esorina', HO.includes("filter(u => u && u !== currentUser?.uid)"));
ok('garde anti double-chargement', HO.includes('mentionLoadingRef.current'));

console.log('\n   Logika naverina');
{
  const build = (up, me) => [...new Set([
    ...(up?.friends || []), ...(up?.followers || []), ...(up?.following || []),
  ])].filter(u => u && u !== me).slice(0, 60);

  eq('namana ihany', build({ friends: ['a', 'b'] }, 'me'), ['a', 'b']);
  eq('abonnés IHANY (bug taloha : foana)', build({ followers: ['x'] }, 'me'), ['x']);
  eq('abonnements ihany', build({ following: ['y'] }, 'me'), ['y']);
  eq('mifangaro + dédoublonné', build({ friends: ['a'], followers: ['a', 'b'], following: ['c'] }, 'me'), ['a', 'b', 'c']);
  eq('tena esorina', build({ friends: ['me', 'a'] }, 'me'), ['a']);
  eq('sanda foana lavina', build({ friends: ['', null, 'a'] }, 'me'), ['a']);
  eq('tsy misy na inona', build({}, 'me'), []);
  eq('fetra 60', build({ friends: Array.from({ length: 100 }, (_, i) => 'u' + i) }, 'me').length, 60);
}

/* ═══ ③ Scroll tsy manakatona ══════════════════════════════════════════ */
console.log('\n③ Scroll — tsy manakatona ny panneau intsony');
{
  const i = HO.indexOf('const close = () => { setPostMenu(null)');
  ok('handler close hita', i !== -1);
  const line = HO.slice(i, HO.indexOf('\n', i));
  ok('setMentionQuery NESORINA amin\'ny close', !line.includes('setMentionQuery'), line.slice(0, 90));
  ok('scroll listener mbola ao (menu hafa)', HO.includes("window.addEventListener('scroll', close, true)"));
}

/* ═══ ④ Composer ═══════════════════════════════════════════════════════ */
console.log('\n④ Composer — picker ampiana');
ok('key __composer__', HO.includes("setMentionQuery({ postId: '__composer__'"));
ok('panneau ao amin\'ny composer', HO.includes("mentionQuery?.postId === '__composer__'"));
ok('mampiditra ao amin\'ny content', HO.includes("setContent(prev => prev.replace(/@([\\p{L}0-9_-]*)$/u, '@' + tag + ' '))"));
ok('avatar ao amin\'ny composer', /__composer__[^]{0,2200}borderRadius:'50%', objectFit:'cover'/.test(HO));
ok('textarea voafono div relative', /position:'relative' \}\}>\s*<textarea className="input" placeholder=\{t\('whatsOnMind'\)\}/.test(HO));

/* ═══ Fanakatonana mbola mandeha ═══════════════════════════════════════ */
console.log('\n⑤ Fanakatonana — mbola mandeha');
eq('setMentionQuery(null) ≥ 4', (HO.match(/setMentionQuery\(null\)/g) || []).length >= 4, true);
ok('mikatona raha tsy mifanaraka (composer)', /else setMentionQuery\(null\);/.test(HO));

/* ═══ Tsy misy régression ══════════════════════════════════════════════ */
console.log('\n⑥ Tsy misy régression');
ok('picker commentaire mbola ao', HO.includes('mentionQuery?.postId === post.id'));
ok('MENTION_SPECIALS mbola ao', HO.includes('const MENTION_SPECIALS = ['));
ok('fanamarinana tompo mbola ao', HO.includes('if (post && post.uid === currentUser.uid) {'));
ok('regex fetra teny mbola ao', HO.includes('const RE = /(^|[^\\p{L}\\p{N}_@])@([a-zA-Z0-9_.]{2,30})/gu;'));
ok('notification mention mbola ao', HO.includes("type: 'mention', postId,"));

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
