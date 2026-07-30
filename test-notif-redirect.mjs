// test-notif-redirect.mjs — TESTE ny routage MARINA ao amin'ny Notifications.jsx
//
// Tsy copie : alaina ao amin'ny fichier ny `notifTarget` sy `handleClick`
// marina, dia ampandehanina miaraka amin'ny `navigate` sandoka.
//
// Fampandehanana :  node test-notif-redirect.mjs
import fs from 'fs';

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  if (got === want) { pass++; console.log('  ✔ ' + label); }
  else { fail++; console.log('  ✘ ' + label + '\n      got  ' + JSON.stringify(got) + '\n      want ' + JSON.stringify(want)); }
};

/* ── Fakana ny fonction marina ──────────────────────────────────────────── */
const SRC = fs.readFileSync('./src/pages/Notifications.jsx', 'utf8');

function grab(header) {
  const i = SRC.indexOf(header);
  if (i < 0) throw new Error('Tsy hita : ' + header);
  let d = 0, j = i + header.length - 1, end = -1;
  for (; j < SRC.length; j++) {
    if (SRC[j] === '{') d++;
    else if (SRC[j] === '}') { d--; if (d === 0) { end = j; break; } }
  }
  if (end < 0) throw new Error('Accolade tsy mifanaraka : ' + header);
  return SRC.slice(i, end + 1);
}

const fnTarget = grab('function notifTarget(n, me) {');
const fnClick  = grab('function handleClick(notif) {');
console.log('📄 notifTarget : ' + fnTarget.split('\n').length + ' andalana');
console.log('📄 handleClick : ' + fnClick.split('\n').length + ' andalana\n');

const build = new Function('navigate', 'currentUser', 'getChatId',
  fnTarget + '\n' + fnClick + '\nreturn { notifTarget, handleClick };');

const ME = { uid: 'me' };
const getChatId = (a, b) => [a, b].sort().join('_');

/** Mamerina ny lalana nalehan'ny clic */
function click(notif) {
  let dest = null;
  const { handleClick } = build((p) => { dest = p; }, ME, getChatId);
  handleClick(notif);
  return dest;
}
function target(notif) {
  const { notifTarget } = build(() => {}, ME, getChatId);
  return notifTarget(notif, ME);
}

/* ═══ 1. Ny olana notaterina : 'general' ═══════════════════════════════════ */
console.log("1) type 'general' — TSY mankany amin'ny feed intsony");
eq('abonnement → profil', click({ type: 'general', fromUid: 'u9', message: "s'est abonné(e)" }), '/profile/u9');
eq('groupe (link)', click({ type: 'general', link: '/groups/g1', fromUid: 'u9' }), '/groups/g1');
eq('discussion (link)', click({ type: 'general', link: '/messages/group_c1', fromUid: 'u9' }), '/messages/group_c1');
eq('VIP (link)', click({ type: 'general', link: '/vip', fromUid: 'admin' }), '/vip');
eq('boost → post (link)', click({ type: 'general', link: '/post/p7', fromUid: 'admin' }), '/post/p7');

/* ═══ 2. link mandresy foana ═══════════════════════════════════════════════ */
console.log('\n2) `link` — laharam-pahamehana sy fiarovana');
eq('link mandresy ny type', click({ type: 'post', postId: 'p1', link: '/groups/g2' }), '/groups/g2');
eq('link http:// LAVINA', click({ type: 'general', link: 'https://evil.test', fromUid: 'u9' }), '/profile/u9');
eq('link tsy misy "/" LAVINA', click({ type: 'general', link: 'evil', fromUid: 'u9' }), '/profile/u9');
eq('link tsy chaîne LAVINA', click({ type: 'general', link: 42, fromUid: 'u9' }), '/profile/u9');
eq('link // (protocol-relative) ekena fa lalana anatiny', target({ link: '/x' }), '/x');

/* ═══ 3. Type efa nisy — tsy misy régression ═══════════════════════════════ */
console.log('\n3) Type efa nisy — tsy voakitika');
eq('post', click({ type: 'post', postId: 'p1' }), '/post/p1');
eq('comment', click({ type: 'comment', postId: 'p2' }), '/post/p2');
eq('reaction', click({ type: 'reaction', postId: 'p3' }), '/post/p3');
eq('boost', click({ type: 'boost', postId: 'p4' }), '/post/p4');
eq('mention', click({ type: 'mention', postId: 'p5' }), '/post/p5');
eq('share', click({ type: 'share', postId: 'p6' }), '/post/p6');
eq('friendRequest', click({ type: 'friendRequest', fromUid: 'u1' }), '/profile/u1');
eq('friendAccepted', click({ type: 'friendAccepted', fromUid: 'u2' }), '/profile/u2');
eq('message + conversationId', click({ type: 'message', conversationId: 'c1' }), '/messages/c1');
eq('message + fromUid', click({ type: 'message', fromUid: 'u3' }), '/messages/me_u3');
eq('artistMessage', click({ type: 'artistMessage', artistId: 'a1' }), '/artists/a1/messages');
eq('artistMessage + visitorUid', click({ type: 'artistMessage', artistId: 'a1', visitorUid: 'v1', fromUid: 'u4' }), '/artists/a1/messages/v1');
eq('shopMessage', click({ type: 'shopMessage', shopId: 's1' }), '/shop/s1/messages');
eq('pageMessage', click({ type: 'pageMessage', pageId: 'g1' }), '/pages/g1/messages');

/* ═══ 4. Identifiant tsy ampy — tsy mianjera amin'ny feed ═════════════════ */
console.log('\n4) Identifiant tsy ampy — fallback fa tsy feed');
eq('post tsy misy postId → profil', click({ type: 'post', fromUid: 'u5' }), '/profile/u5');
eq('comment tsy misy postId → profil', click({ type: 'comment', fromUid: 'u6' }), '/profile/u6');
eq('mention tsy misy postId → profil', click({ type: 'mention', fromUid: 'u7' }), '/profile/u7');
eq('artistMessage tsy misy artistId → profil', click({ type: 'artistMessage', fromUid: 'u8' }), '/profile/u8');
eq('shopMessage tsy misy shopId → profil', click({ type: 'shopMessage', fromUid: 'u8' }), '/profile/u8');
eq('friendRequest tsy misy fromUid → /', click({ type: 'friendRequest' }), '/');
eq('type tsy fantatra + postId → post', click({ type: 'zzz', postId: 'p9' }), '/post/p9');
eq('type tsy fantatra + fromUid → profil', click({ type: 'zzz', fromUid: 'u9' }), '/profile/u9');

/* ═══ 5. Laharam-pahamehan'ny fallback ════════════════════════════════════ */
console.log('\n5) Laharam-pahamehana ao amin\'ny notifTarget');
eq('postId mialoha ny conversationId', target({ postId: 'p', conversationId: 'c' }), '/post/p');
eq('conversationId mialoha ny groupId', target({ conversationId: 'c', groupId: 'g' }), '/messages/c');
eq('groupId mialoha ny shopId', target({ groupId: 'g', shopId: 's' }), '/groups/g');
eq('shopId mialoha ny artistId', target({ shopId: 's', artistId: 'a' }), '/shop/s');
eq('artistId mialoha ny pageId', target({ artistId: 'a', pageId: 'pg' }), '/artists/a');
eq('pageId mialoha ny fromUid', target({ pageId: 'pg', fromUid: 'u' }), '/pages/pg');

/* ═══ 6. Cas limites — tsy crash mihitsy ══════════════════════════════════ */
console.log('\n6) Cas limites');
eq('notif null → /', target(null), '/');
eq('notif foana → /', target({}), '/');
eq('fromUid = tena → / (tsy mankany amin\'ny profil-nao)', target({ fromUid: 'me' }), '/');
eq('type undefined + foana → /', click({}), '/');
eq('saha foana lavina', target({ postId: '', groupId: '', fromUid: 'u1' }), '/profile/u1');

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
