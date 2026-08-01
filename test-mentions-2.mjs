// test-mentions-2.mjs — Picker fomba Facebook + @followers / @everyone
//
// Fampandehanana :  node test-mentions-2.mjs
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
const MP = fs.readFileSync('./src/components/MentionPanel.jsx', 'utf8');
const LK = fs.readFileSync('./src/components/Linkify.jsx', 'utf8');
const { splitRich } = await import('./src/utils/appLink.js');

/* ═══ 1. Picker ═════════════════════════════════════════════════════════ */
console.log('1) Picker fomba Facebook');
ok('sary alaina ao amin\'ny lisitra', HO.includes("photo: sn.data().photoThumb || sn.data().photoURL || ''"));
ok('avatar aseho (44 px, MentionPanel)', MP.includes("width: 44, height: 44, borderRadius: '50%', objectFit: 'cover'"));
ok('anarana feno', HO.includes("fontSize:13, fontWeight:600, color:'#050505'"));
ok('@username ambany (MentionPanel)', MP.includes("fontSize: 12, color: '#65676B'"));
ok('fallback ui-avatars', HO.includes('ui-avatars.com/api/?name=${encodeURIComponent(f.fullName'));

/* ═══ 2. Safidy manokana ════════════════════════════════════════════════ */
console.log('\n2) @followers / @everyone');
ok('MENTION_SPECIALS voafaritra', HO.includes('const MENTION_SPECIALS = ['));
ok('label Abonnés', HO.includes("label: 'Abonnés'"));
ok('label Tout le monde', HO.includes("label: 'Tout le monde'"));
ok('fetra 200', HO.includes('const MENTION_MAX = 200;'));
ok('tompo ihany ao amin\'ny picker', HO.includes('showSpecials={post.uid === currentUser.uid}'));
ok('picker : specials raha tompo', MP.includes('const specials = showSpecials'));

console.log('\n   Fiarovana amin\'ny fandefasana');
ok('fanamarinana tompo INDRAY', HO.includes("if (post && post.uid === currentUser.uid) {"));
ok('followers → abonnés', HO.includes("const wantFollowers = mentionUsernames.has('followers');"));
ok('everyone → + namana', HO.includes("if (wantEveryone) for (const u of (userProfile.friends || [])) set.add(u);"));
ok('tsy mandefa amin\'ny tena', HO.includes('set.delete(currentUser.uid);'));
ok('fetra voahaja', HO.includes('.slice(0, MENTION_MAX)'));

/* ═══ 3. Logika mpandray (naverina) ════════════════════════════════════ */
console.log('\n3) Logika mpandray');
{
  const targets = (up, me, wantF, wantE, max = 200) => {
    const set = new Set();
    for (const u of (up.followers || [])) set.add(u);
    if (wantE) for (const u of (up.friends || [])) set.add(u);
    set.delete(me);
    return [...set].slice(0, max);
  };
  const up = { followers: ['a', 'b', 'me'], friends: ['b', 'c'] };

  eq('@followers → abonnés ihany', targets(up, 'me', true, false), ['a', 'b']);
  eq('@everyone → abonnés + namana', targets(up, 'me', false, true), ['a', 'b', 'c']);
  eq('dédoublonnage (b indray mandeha)', targets(up, 'me', false, true).filter(x => x === 'b').length, 1);
  eq('tena esorina', targets(up, 'me', true, false).includes('me'), false);
  eq('fetra voahaja', targets({ followers: Array.from({length:500},(_,i)=>'u'+i) }, 'me', true, false).length, 200);
  eq('tsy misy abonné → foana', targets({}, 'me', true, false), []);
}

/* ═══ 4. Rendu ny token manokana ═══════════════════════════════════════ */
console.log('\n4) Rendu — badge fa tsy lien');
ok('SPECIAL_TAGS ao amin\'ny Linkify', LK.includes("const SPECIAL_TAGS = { followers: 'Abonnés', everyone: 'Tout le monde' };"));
ok('badge tsy clicable (span)', /if \(sp\) \{[^]{0,200}<span key=\{i\}/.test(LK));
ok('sora-baventy tsy misy dikany', LK.includes('String(p.username).toLowerCase()'));
ok('mention mahazatra mbola lien', LK.includes('navigate(`/u/${p.username}`)'));

console.log('\n   Parsing');
eq('@followers parsé ho mention', splitRich('Salama @followers').filter(p => p.type === 'mention').map(p => p.username), ['followers']);
eq('@everyone parsé', splitRich('@everyone e').filter(p => p.type === 'mention').map(p => p.username), ['everyone']);
eq('@followers sy olona', splitRich('@followers ary @tony').filter(p => p.type === 'mention').map(p => p.username), ['followers', 'tony']);

/* ═══ 5. Tsy misy régression ═══════════════════════════════════════════ */
console.log('\n5) Tsy misy régression');
ok('mention tsirairay mbola mandefa push', HO.includes("sendPushNotification({ toExternalId: f.uid"));
ok('fetra 10 ho an\'ny mention tsirairay', HO.includes('mentioned.slice(0, 10)'));
ok('regex fetra teny mbola ao', HO.includes('const RE = /(^|[^\\p{L}\\p{N}_@])@([a-zA-Z0-9_.]{2,30})/gu;'));

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
