// test-mentions-partout.mjs — Mention amin'ny commentaire REHETRA
//
// Ny tanjona voalohany : TSY MISY PEJY HADINO. Io no fahadisoana nataoko.
//
// Fampandehanana :  node test-mentions-partout.mjs
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
const R = (p) => fs.readFileSync(p, 'utf8');

/* ═══ 1. FANDRAKOFANA — tsy misy pejy hadino ═══════════════════════════ */
console.log('1) Fandrakofana — toerana rehetra misy commentaire');
{
  const PAGES = {
    'Home.jsx':       './src/pages/Home.jsx',
    'PostDetail.jsx': './src/pages/PostDetail.jsx',
    'Profile.jsx':    './src/pages/Profile.jsx',
    'Reels.jsx':      './src/pages/Reels.jsx',
  };
  for (const [n, p] of Object.entries(PAGES)) {
    const s = R(p);
    ok(n.padEnd(16) + ' misy MentionPanel', s.includes('<MentionPanel'),
       (s.match(/<MentionPanel/g) || []).length + '×');
  }

  // Tsy misy champ commentaire tsy voarakotra
  const orphans = [];
  for (const [n, p] of Object.entries(PAGES)) {
    const s = R(p);
    const hasInput = /placeholder=\{[^}]*writeComment|Écrire un commentaire/.test(s);
    const hasPanel = s.includes('<MentionPanel');
    if (hasInput && !hasPanel) orphans.push(n);
  }
  eq('champ commentaire tsy voarakotra', orphans, []);
}

/* ═══ 2. Hook mizara ═══════════════════════════════════════════════════ */
console.log('\n2) Hook `useMentions` — tsy misy fiverimberenana');
{
  const H = R('./src/hooks/useMentions.js');
  ok('exporté', H.includes('export default function useMentions'));
  ok('friends + followers + following', /friends[^]{0,120}followers[^]{0,120}following/.test(H));
  ok('dédoublonnage', H.includes('[...new Set(['));
  ok('tena esorina', H.includes("filter(u => u && u !== currentUser?.uid)"));
  ok('fetra 60', H.includes('.slice(0, 60)'));
  ok('garde anti double-chargement', H.includes('loadingRef.current'));
  ok('onType / isOpen / insert / close', ['onType', 'isOpen', 'insert', 'close'].every(k => H.includes(k)));

  for (const [n, p] of Object.entries({
    'PostDetail': './src/pages/PostDetail.jsx',
    'Profile':    './src/pages/Profile.jsx',
    'Reels':      './src/pages/Reels.jsx',
  })) ok(n + ' mampiasa ny hook', R(p).includes('useMentions(userProfile, currentUser)'));
}

/* ═══ 3. Logika naverina ═══════════════════════════════════════════════ */
console.log('\n3) Logika (naverina avy amin\'ny hook)');
{
  const AT_RE = /@([\p{L}0-9_.-]*)$/u;
  const detect = (v) => { const m = String(v || '').match(AT_RE); return m ? m[1].toLowerCase() : null; };
  const insert = (v, tag) => String(v || '').replace(AT_RE, '@' + tag + ' ');

  eq('@ foana → query foana', detect('Salama @'), '');
  eq('@to → "to"', detect('Salama @to'), 'to');
  eq('tsy misy @ → null', detect('Salama'), null);
  eq('@ tsy any am-parany → null', detect('@tony salama'), null);
  eq('espace aorian\'ny @ → null', detect('@tony '), null);

  eq('fampidirana', insert('Salama @to', 'tony'), 'Salama @tony ');
  eq('fampidirana avy amin\'ny @ foana', insert('@', 'tony'), '@tony ');
  eq('teny mialoha voatazona', insert('Ry @ton', 'tony'), 'Ry @tony ');
}

/* ═══ 4. Fifandraisana amin'ny champ ═══════════════════════════════════ */
console.log('\n4) Fifandraisana amin\'ny champ');
{
  const PD = R('./src/pages/PostDetail.jsx');
  const PF = R('./src/pages/Profile.jsx');
  const RL = R('./src/pages/Reels.jsx');

  ok('PostDetail onChange manetsika', PD.includes('mentions.onType(e.target.value)'));
  ok('PostDetail onPick mampiditra', PD.includes('setCmtText(v => mentions.insert(v, tag))'));
  ok('Profile key = post.id', PF.includes('mentions.onType(e.target.value, post.id)'));
  ok('Profile isOpen(post.id)', PF.includes('mentions.isOpen(post.id)'));
  ok('Reels onChange manetsika', RL.includes('mentions.onType(e.target.value)'));
  ok('Reels onPick mampiditra', RL.includes('setCommentText(v => mentions.insert(v, tag))'));

  ok('PostDetail specials ho an\'ny tompo', PD.includes('showSpecials={post?.uid === currentUser?.uid}'));
  ok('Profile specials ho an\'ny tompo', PF.includes('showSpecials={post.uid === currentUser?.uid}'));
}

/* ═══ 5. Tsy misy régression ═══════════════════════════════════════════ */
console.log('\n5) Tsy misy régression');
{
  const HO = R('./src/pages/Home.jsx');
  ok('Home tsy voakitika (loadMentionPeople)', HO.includes('async function loadMentionPeople()'));
  ok('Home panel roa', (HO.match(/<MentionPanel/g) || []).length === 2);
  ok('Home tsy mampiasa ny hook (tsy nokitihina)', !HO.includes('useMentions('));
  ok('MentionPanel iray ihany', fs.existsSync('./src/components/MentionPanel.jsx'));

  const RL = R('./src/pages/Reels.jsx');
  ok('Reels : panel frère mazava (tsy fragment maloto)', !RL.includes("</>{''}"));
}

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
