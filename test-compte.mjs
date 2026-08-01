// test-compte.mjs — Optimiste + Désactiver / Supprimer compte
//
// Fampandehanana :  node test-compte.mjs
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
const SS = fs.readFileSync('./src/pages/SecuritySettings.jsx', 'utf8');

/* ═══ 1. Optimiste ═════════════════════════════════════════════════════ */
console.log('1) Réaction hita avy hatrany');
eq('fanovana 4 voatondro', (PD.match(/\/\* optimiste \*\//g) || []).length, 4);
ok('réaction : setPost mialoha', /\/\* optimiste \*\/[^]{0,200}setPost\(p => \(p \? \{ \.\.\.p, comments: updated \}/.test(PD));
ok('commentaire vaovao : ampiana avy hatrany', PD.includes('comments: [...(p.comments || []), cmt]'));
ok('famafana : esorina avy hatrany', PD.includes('(p.comments || []).filter(x => x.id !== cmt.id)'));

console.log('\n   Rollback raha tsy mety');
eq('try/catch 4', (PD.match(/catch \(e\) \{/g) || []).length >= 4, true);
ok('réaction rollback', PD.includes('setPost(p => (p ? { ...p, comments: before } : p));   // rollback'));
ok('ajout rollback', PD.includes('comments: beforeAdd'));
ok('suppression rollback', PD.includes('comments: beforeDel'));
ok('édition rollback', PD.includes('comments: beforeEdit'));

console.log('\n   Logika naverina');
{
  const react = (comments, cmtId, uid, emoji) => comments.map(c => {
    if (c.id !== cmtId) return c;
    const r = c.reactions || {}, my = r[uid];
    if (my === emoji) { const u = { ...r }; delete u[uid]; return { ...c, reactions: u }; }
    return { ...c, reactions: { ...r, [uid]: emoji } };
  });
  const C = [{ id: 'a' }, { id: 'b', reactions: { me: '👍' } }];
  eq('ampiana', react(C, 'a', 'me', '❤️')[0].reactions, { me: '❤️' });
  eq('mitovy → esorina', react(C, 'b', 'me', '👍')[1].reactions, {});
  eq('hafa → soloina', react(C, 'b', 'me', '😂')[1].reactions, { me: '😂' });
  eq('hafa tsy voakasika', react(C, 'a', 'me', '❤️')[1].reactions, { me: '👍' });
}

/* ═══ 2. Désactiver / Supprimer ═══════════════════════════════════════ */
console.log('\n2) Menu');
ok('Désactiver ao amin\'ny menu', SS.includes("key: 'deactivate'"));
ok('Supprimer ao amin\'ny menu', SS.includes("key: 'delete'"));
ok('loko fampitandremana', SS.includes("color: '#f59e0b'") && SS.includes("color: '#ef4444'"));

console.log('\n   Fitandremana — fiasa manimba');
ok('mot de passe takiana (désactiver)', /handleDeactivate[^]{0,400}await reauthenticate\(\)/.test(SS));
ok('mot de passe takiana (supprimer)', /handleDeleteAccount[^]{0,700}await reauthenticate\(\)/.test(SS));
ok('« SUPPRIMER » an-tsoratra', SS.includes("confirmText.trim().toUpperCase() !== 'SUPPRIMER'"));
ok('window.confirm fanampiny', (SS.match(/window\.confirm/g) || []).length >= 2);
ok('bokotra voasakana raha tsy feno', SS.includes("disabled={loading || !currentPassword ||"));

console.log('\n   Fitondrana');
ok('désactiver : disabled true', SS.includes('disabled: true, disabledAt: serverTimestamp()'));
ok('désactiver : signOut', SS.includes('await signOut(auth)'));
ok('supprimer : deletedAt', SS.includes('disabled: true, deletedAt: serverTimestamp()'));
ok('supprimer : données manokana diovina', SS.includes("photoURL: '', photoThumb: '', coverURL: '', bio: '', phone: ''"));
ok('supprimer : deleteUser', SS.includes('await deleteUser(currentUser)'));

console.log('\n   Fahadisoana voaray');
for (const code of ['auth/wrong-password', 'auth/too-many-requests', 'auth/requires-recent-login']) {
  ok(code, SS.includes(code));
}

console.log('\n   Fanamarinana logika');
{
  const canDelete = (pwd, txt) => !!pwd && txt.trim().toUpperCase() === 'SUPPRIMER';
  eq('tsy misy mdp → tsia', canDelete('', 'SUPPRIMER'), false);
  eq('tsy misy soratra → tsia', canDelete('x', ''), false);
  eq('soratra diso → tsia', canDelete('x', 'supprime'), false);
  eq('sora-baventy kely ekena', canDelete('x', 'supprimer'), true);
  eq('elanelana ekena', canDelete('x', '  SUPPRIMER  '), true);
  eq('feno → eny', canDelete('x', 'SUPPRIMER'), true);
}

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
