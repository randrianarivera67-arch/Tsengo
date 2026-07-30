// patch-avatar-ext.cjs  (FRONTEND — PostDetail.jsx)
// Avatar (story ring + green dot + choix story/profil) amin'ny :
//   • PostDetail : avatar auteur (header) + avatar commentaire
// (GroupPage header tsy kasihina : navigation manokana shop/artiste)
// Idempotent + anchor guards.
const fs = require('fs');

function addImport(path, importLine) {
  let s = fs.readFileSync(path, 'utf8');
  if (s.includes("import Avatar from")) return;
  const anchor = "import { useParams, useNavigate } from 'react-router-dom';";
  if (!s.includes(anchor)) { console.log('  ❌ ' + path + ' import anchor introuvable'); process.exit(1); }
  s = s.replace(anchor, anchor + '\n' + importLine);
  fs.writeFileSync(path, s);
}

function patchFile(path, edits) {
  let s = fs.readFileSync(path, 'utf8');
  let changed = 0;
  for (const [label, oldStr, newStr] of edits) {
    if (s.includes(newStr) && !s.includes(oldStr)) { console.log('  ⏭️  ' + label + ' — deja applique'); continue; }
    const n = s.split(oldStr).length - 1;
    if (n !== 1) { console.log('  ❌ ' + label + ' — ancre introuvable/multiple (' + n + ')'); process.exit(1); }
    s = s.replace(oldStr, newStr); changed++; console.log('  ✅ ' + label);
  }
  if (changed) fs.writeFileSync(path, s);
}

console.log('src/pages/PostDetail.jsx');
addImport('src/pages/PostDetail.jsx', "import Avatar from '../components/Avatar';");
patchFile('src/pages/PostDetail.jsx', [
  [
    'avatar auteur (header)',
    '<img src={post.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName||\'U\')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:42, height:42, flexShrink:0 }}/>',
    '<Avatar uid={post.uid} src={post.authorPhoto} name={post.authorName} size={42} />',
  ],
  [
    'avatar commentaire',
    '<img src={c.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName||\'U\')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:32, height:32, flexShrink:0, cursor:\'pointer\' }} onClick={() => navigate(`/profile/${c.uid}`)}/>',
    '<Avatar uid={c.uid} src={c.authorPhoto} name={c.authorName} size={32} />',
  ],
]);

console.log('✅ Avatar apetraka amin\'ny PostDetail (header + commentaire).');
