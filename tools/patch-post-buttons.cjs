// patch-post-buttons.cjs  (FRONTEND)
// Amin'ny publication (post header) :
//   1. Bokotra "Suivre" : esorina ny étoile (NeonStar / ⭐) → kely, tsy manimba CSS
//   2. Bokotra "Ajouter" (add friend) : icône IHANY (esorina ny soratra "Ajouter")
// Toerana : Home (feed), PostDetail, ary ny follow artiste/boutique (⭐).
// TSY kasihina : "Ajouter au panier / un membre / un article / une couverture".
// Idempotent + anchor unique guards.
const fs = require('fs');

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

// ── Home.jsx : Suivre sans étoile + Ajouter icône seule ──
console.log('src/pages/Home.jsx');
patchFile('src/pages/Home.jsx', [
  [
    'Suivre : esorina ny étoile (post header)',
    '{isFollowingUid(post.uid) ? <><HiCheck size={13}/> Suivi</> : <><NeonStar size={13} color="#4A3400"/> Suivre</>}',
    '{isFollowingUid(post.uid) ? <><HiCheck size={13}/> Suivi</> : <>Suivre</>}',
  ],
  [
    'Ajouter : icône seule (post header)',
    '<HiUserAdd size={13}/> Ajouter\n                  </button>',
    '<HiUserAdd size={13}/>\n                  </button>',
  ],
]);

// ── PostDetail.jsx : Ajouter icône seule ──
console.log('src/pages/PostDetail.jsx');
patchFile('src/pages/PostDetail.jsx', [
  [
    'Ajouter : icône seule',
    '<HiUserAdd size={13}/> Ajouter</button>',
    '<HiUserAdd size={13}/></button>',
  ],
]);

// ── ArtistDetail.jsx : esorina ny ⭐ ──
console.log('src/pages/ArtistDetail.jsx');
patchFile('src/pages/ArtistDetail.jsx', [
  [
    'Suivre artiste : esorina ny ⭐',
    "{isFollowing ? '✓ Abonné' : '⭐ Suivre cet artiste'}",
    "{isFollowing ? '✓ Abonné' : 'Suivre cet artiste'}",
  ],
]);

// ── ShopDetail.jsx : esorina ny ⭐ ──
console.log('src/pages/ShopDetail.jsx');
patchFile('src/pages/ShopDetail.jsx', [
  [
    'Suivre boutique : esorina ny ⭐',
    "{isFollowing ? '✓ Abonné' : '⭐ Suivre cette boutique'}",
    "{isFollowing ? '✓ Abonné' : 'Suivre cette boutique'}",
  ],
]);

console.log('✅ Bokotra publication amboarina (Suivre sans étoile + Ajouter icône).');
