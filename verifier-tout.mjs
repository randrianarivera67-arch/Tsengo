// verifier-tout.mjs — Fanamarinana ny fanovana REHETRA natao
//
// Mijery ny code fa tsy manova na inona na inona. Mamoaka lisitra mazava :
// izay mbola ao, izay very.
//
// Fampandehanana :  node verifier-tout.mjs
import fs from 'fs';

const R = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
let ok = 0, ko = 0;
const G = [];

function chk(groupe, nom, fichier, marika) {
  const s = R(fichier);
  const found = s === null ? null : (Array.isArray(marika) ? marika.every(m => s.includes(m)) : s.includes(marika));
  G.push({ groupe, nom, fichier, found });
  if (found) ok++; else ko++;
}

/* ══ MODE LITE ══ */
chk('Mode Lite', 'utils/liteMode.js misy',        './src/utils/liteMode.js', 'export function isLiteOn');
chk('Mode Lite', 'velona par défaut',             './src/utils/liteMode.js', "!== '0'");
chk('Mode Lite', 'BOKOTRA ao amin\'ny menu',      './src/components/Layout.jsx', 'setLite(!liteOn)');
chk('Mode Lite', 'useOnline guard',               './src/hooks/useOnline.js', 'if (lite) { setMap({}); return; }');
chk('Mode Lite', 'feed listener guard',           './src/pages/Home.jsx', 'if (lite) { setPostsLoading(false); return; }');
chk('Mode Lite', 'pejy 12/10',                    './src/pages/Home.jsx', 'lite ? 12 : 30');
chk('Mode Lite', 'video tsy autoplay',            './src/pages/Home.jsx', 'dataSaver={dataSaver || lite}');

/* ══ SARY ══ */
chk('Sary', 'JPEG (tsy WebP)',                    './src/utils/telegram.js', "'image/jpeg'");
chk('Sary', 'makeThumb misy',                     './src/utils/telegram.js', 'export async function makeThumb');
chk('Sary', 'fampiakarana 1080',                  './src/utils/telegram.js', 'maxWidth = 1080');
chk('Sary', 'feed = mediaURL (mazava)',           './src/pages/Home.jsx', 'post.mediaURL || post.thumbURL');
chk('Sary', 'média 72vh',                         './src/pages/Home.jsx', "maxHeight:'72vh'");
chk('Sary', 'avatar photoThumb',                  './src/pages/Profile.jsx', 'photoThumb');

/* ══ CARTE MANIDINA ══ */
for (const [n, f] of [['Home','./src/pages/Home.jsx'], ['Profile','./src/pages/Profile.jsx'], ['GroupPage','./src/pages/GroupPage.jsx']])
  chk('Carte manidina', n, f, 'FARITRA MANIDINA');
chk('Carte manidina', 'icône néon 25 px',         './src/pages/Home.jsx', 'NeonLike size={25}');
chk('Carte manidina', 'pouce rempli',             './src/components/NeonIcons.jsx', 'filled = false');
chk('Carte manidina', '@username nesorina',       './src/pages/Home.jsx', null);

/* ══ MENTION ══ */
chk('Mention', 'MentionPanel misy',               './src/components/MentionPanel.jsx', 'createPortal');
chk('Mention', 'useMentions hook',                './src/hooks/useMentions.js', 'export default function useMentions');
chk('Mention', 'token entité',                    './src/utils/appLink.js', 'ENTITY_RE');
chk('Mention', 'toStorage',                       './src/hooks/useMentions.js', 'toStorage');
chk('Mention', 'route /u/:username',              './src/App.jsx', 'path="/u/:username"');
for (const [n, f] of [['PostDetail','./src/pages/PostDetail.jsx'], ['Profile','./src/pages/Profile.jsx'], ['Reels','./src/pages/Reels.jsx']])
  chk('Mention', n, f, 'useMentions');

/* ══ HASHTAG ══ */
chk('Hashtag', 'parser',                          './src/utils/appLink.js', 'HASHTAG_RE');
chk('Hashtag', 'extractHashtags',                 './src/utils/appLink.js', 'export function extractHashtags');
chk('Hashtag', 'fitehirizana',                    './src/pages/Home.jsx', 'hashtags: extractHashtags');
chk('Hashtag', 'pejy',                            './src/pages/HashtagPage.jsx', 'array-contains');
chk('Hashtag', 'route',                           './src/App.jsx', 'path="/hashtag/:tag"');

/* ══ COMMENTAIRE ══ */
chk('Commentaire', 'CommentSheet',                './src/components/CommentSheet.jsx', 'createPortal');
chk('Commentaire', 'commentThread',               './src/utils/commentThread.js', 'export function buildThread');
chk('Commentaire', 'voarohy PostDetail',          './src/pages/PostDetail.jsx', '<CommentSheet');
chk('Commentaire', 'appui long réaction',         './src/components/CommentSheet.jsx', 'likePressRef');
chk('Commentaire', 'picker toerana refesina',     './src/components/CommentSheet.jsx', 'pickerPos');
chk('Commentaire', 'Copier',                      './src/components/CommentSheet.jsx', '>Copier</button>');
chk('Commentaire', 'optimiste',                   './src/pages/PostDetail.jsx', '/* optimiste */');
chk('Commentaire', 'voir plus partagée',          './src/pages/Home.jsx', "post.id + ':s'");

/* ══ ALBUM PHOTO ══ */
chk('Album', 'PHOTO_ALBUMS',                      './src/pages/Profile.jsx', 'PHOTO_ALBUMS');

/* ══ FIAROVANA ══ */
chk('Fiarovana', 'ID token (front)',              './src/utils/onesignal.js', 'authHeader');
chk('Fiarovana', 'secret voaesotra',              './src/utils/onesignal.js', null);
chk('Fiarovana', 'désactiver compte',             './src/pages/SecuritySettings.jsx', 'handleDeactivate');
chk('Fiarovana', 'supprimer compte',              './src/pages/SecuritySettings.jsx', 'handleDeleteAccount');

/* ══ HAFA ══ */
chk('Hafa', 'réaction optimiste (fil)',           './src/pages/Home.jsx', '/* réaction optimiste */');
chk('Hafa', 'clic commentaire ?c=1',              './src/pages/PostDetail.jsx', "get('c')");
chk('Hafa', 'clavier inset',                      './src/hooks/useKeyboardInset.js', 'visualViewport');
chk('Hafa', 'Linkify mention+hashtag',            './src/components/Linkify.jsx', ["type === 'mention'", "type === 'hashtag'"]);

/* ── Fanamarinana miova (marika TSY tokony ho ao) ── */
const inverse = [
  ['Carte manidina', '@username nesorina', './src/pages/Home.jsx', '@{post.authorUsername}'],
  ['Fiarovana', 'secret voaesotra', './src/utils/onesignal.js', "'x-notify-secret': NOTIFY_SECRET"],
];
for (const [g, n, f, m] of inverse) {
  const s = R(f);
  const i = G.findIndex(x => x.groupe === g && x.nom === n);
  const good = s !== null && !s.includes(m);
  if (i >= 0) { if (G[i].found === null) { G[i].found = good; good ? ok++ : ko++; } }
}

/* ── Vokatra ── */
let cur = '';
for (const g of G) {
  if (g.groupe !== cur) { cur = g.groupe; console.log('\n── ' + cur + ' ──'); }
  const mark = g.found === true ? '✔' : (g.found === null ? '?' : '✘');
  console.log('  ' + mark + ' ' + g.nom + (g.found === false ? '   ← VERY' : ''));
}
console.log('\n═════════════════════════════');
console.log(ok + ' ao · ' + ko + ' VERY');
if (ko) {
  console.log('\nVERY :');
  G.filter(x => x.found === false).forEach(x => console.log('  • ' + x.groupe + ' → ' + x.nom + '  (' + x.fichier + ')'));
}
