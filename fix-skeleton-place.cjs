// fix-skeleton-place.cjs
// Olana : mandritra ny chargement, ny skeleton dia miseho AMBONY ny stories + composer,
// ka voatosika midina hatrany ambany ny "Créer une story" (toy ny hita amin'ny screenshot).
// Vahaolana : afindra ny skeleton ho eo amin'ny toeran'ny Feed (ambanin'ny stories + composer).
// Idempotent : raha efa vita, tsy manova na inona na inona.
const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');

const SKEL =
`      {postsLoading && posts.length === 0 && (
        <div style={{ padding: '0 0 8px' }}>
          <SkeletonPost />
          <SkeletonPost />
        </div>
      )}`;

const FEED = `      {/* Feed */}`;

// Deja applique ? (skeleton deja juste au-dessus du Feed)
if (s.includes(SKEL + '\n\n' + FEED) || s.includes(SKEL + '\n' + FEED)) {
  console.log('⏭️  Deja applique — skeleton deja au niveau du Feed.');
  process.exit(0);
}

// 1) Verifs d'unicite
const cSkel = s.split(SKEL).length - 1;
const cFeed = s.split(FEED).length - 1;
if (cSkel !== 1) { console.log('❌ Bloc skeleton introuvable ou multiple (' + cSkel + ')'); process.exit(1); }
if (cFeed !== 1) { console.log('❌ Marqueur Feed introuvable ou multiple (' + cFeed + ')'); process.exit(1); }

// 2) Retirer le skeleton de sa position actuelle (en haut) + la ligne vide qui suit
s = s.replace(SKEL + '\n\n', '');

// 3) Le reinserer juste avant le Feed
s = s.replace(FEED, SKEL + '\n\n' + FEED);

// 4) Controle final
if ((s.split(SKEL).length - 1) !== 1) { console.log('❌ Etat final incoherent'); process.exit(1); }

fs.writeFileSync(p, s);
console.log('✅ Skeleton deplace au niveau du Feed (stories + composer restent en haut).');
