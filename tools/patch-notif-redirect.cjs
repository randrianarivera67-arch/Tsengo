/**
 * patch-notif-redirect.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA : ny tsindry amin'ny notification dia mankany amin'ny FEED fa tsy amin'ny
 *         loharano marina.
 *
 * FOTOTRA (voamarina tao amin'ny code) :
 *   `type: 'general'` no ampiasaina amin'ny toerana FITO (abonnement ×2, ajout
 *   groupe, ajout discussion, VIP activé, VIP refusé, boost refusé) nefa TSY ao
 *   anatin'ny `switch` ao amin'ny handleClick → mianjera amin'ny
 *   `default: navigate('/')`.
 *   Ary ireo notification ireo dia TSY mitondra identifiant mihitsy (tsy misy
 *   groupId / conversationId / postId) — ny `fromUid` ihany.
 *
 * VAHAOLANA — roa sosona :
 *   A) Notifications.jsx : routage matanjaka
 *        1. `notif.link` raha misy      → tanjona mazava (notification VAOVAO)
 *        2. switch araka ny `type`      → toy ny teo aloha
 *        3. `general` + type tsy fantatra → fallback araka ny saha misy :
 *           postId → conversationId → groupId → shopId → artistId → fromUid
 *        4. `/` raha tsy misy na inona na inona
 *      ⇒ Ny notification EFA AO amin'ny base dia voavaha koa (abonnement →
 *        profil), tsy mila migration.
 *
 *   B) 5 toerana fanoratana : ampiana `link` mazava
 *        groupe → /groups/:id · discussion → /messages/group_:id
 *        VIP ×2 → /vip        · boost      → /post|/profile|/shop|/artists
 *      ⇒ Ny abonnement (×2) dia TSY ovaina : voavaha ny fallback, ka tsy
 *        mikitika code tsy ilaina isika.
 *
 * TSY MIKITIKA : ny feed, ny score, ny rank — tsy misy nokasihina mihitsy.
 *
 * Fampandehanana :  node patch-notif-redirect.cjs --dry
 *                   node patch-notif-redirect.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(ROOT, r);

function read(f) {
  if (!fs.existsSync(f)) throw new Error('FICHIER TSY HITA : ' + f);
  return fs.readFileSync(f, 'utf8');
}
const countOf = (s, sub) => s.split(sub).length - 1;

function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1 fiseho, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 220) + '\n-----------');
  }
  return src.replace(old, neo);
}

const files = {};
const touched = [];
const load = (r) => (files[r] = files[r] || read(P(r)));
const save = (r, s) => { files[r] = s; if (!touched.includes(r)) touched.push(r); };

/* ═══════════════════════════════════════════════════════════════════════════
   A — pages/Notifications.jsx : routage matanjaka
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Notifications.jsx';
  let s = load(rel);

  if (s.includes('notifTarget')) {
    console.log('  ⏭  Notifications.jsx : efa voapatch');
  } else {
    s = rep(s,
      `      default: navigate('/');
    }
  }`,
      `      default: navigate(notifTarget(notif, currentUser));
    }
  }`,
      'notif:default');

    // Fallback : mamaky izay saha misy ao anatin'ny notification
    s = rep(s,
      '  function handleClick(notif) {\n    switch (notif.type) {',
      `  /**
   * Tanjona ho an'ny notification tsy manana \`type\` fantatra (ohatra 'general').
   * Mamaky izay identifiant MISY ao anatiny, araka ny laharam-pahamehana.
   * Tsy mamorona lalana tsy misy : mamerina '/' raha tsy misy na inona na inona.
   */
  function notifTarget(n, me) {
    if (!n) return '/';
    if (n.link && typeof n.link === 'string' && n.link.startsWith('/')) return n.link;
    if (n.postId)         return \`/post/\${n.postId}\`;
    if (n.conversationId) return \`/messages/\${n.conversationId}\`;
    if (n.groupId)        return \`/groups/\${n.groupId}\`;
    if (n.shopId)         return \`/shop/\${n.shopId}\`;
    if (n.artistId)       return \`/artists/\${n.artistId}\`;
    if (n.pageId)         return \`/pages/\${n.pageId}\`;
    // Farany : ny olona nahatonga ny notification (abonnement, sns.)
    if (n.fromUid && n.fromUid !== me?.uid) return \`/profile/\${n.fromUid}\`;
    return '/';
  }

  function handleClick(notif) {
    // Tanjona voafaritra mazava tamin'ny fanoratana → mandresy foana
    if (notif.link && typeof notif.link === 'string' && notif.link.startsWith('/')) {
      navigate(notif.link);
      return;
    }
    switch (notif.type) {`,
      'notif:helper');

    // Ny fallback `'/'` sisa ao anatin'ny switch → notifTarget koa.
    // Raha tsy misy ny identifiant andrasana (données tranainy na tsy feno) dia
    // aleo mankany amin'ny profil noho ny miverina amin'ny feed.
    s = rep(s,
      "navigate(notif.artistId ? `/artists/${notif.artistId}/messages` + (notif.visitorUid && notif.fromUid !== currentUser.uid ? `/${notif.visitorUid}` : '') : '/');",
      "navigate(notif.artistId ? `/artists/${notif.artistId}/messages` + (notif.visitorUid && notif.fromUid !== currentUser.uid ? `/${notif.visitorUid}` : '') : notifTarget(notif, currentUser));",
      'notif:fb-artist');

    s = rep(s,
      "navigate(notif.shopId ? `/shop/${notif.shopId}/messages` + (notif.visitorUid && notif.fromUid !== currentUser.uid ? `/${notif.visitorUid}` : '') : '/');",
      "navigate(notif.shopId ? `/shop/${notif.shopId}/messages` + (notif.visitorUid && notif.fromUid !== currentUser.uid ? `/${notif.visitorUid}` : '') : notifTarget(notif, currentUser));",
      'notif:fb-shop');

    s = rep(s,
      "navigate(notif.pageId ? `/pages/${notif.pageId}/messages` + (notif.visitorUid && notif.fromUid !== currentUser.uid ? `/${notif.visitorUid}` : '') : '/');",
      "navigate(notif.pageId ? `/pages/${notif.pageId}/messages` + (notif.visitorUid && notif.fromUid !== currentUser.uid ? `/${notif.visitorUid}` : '') : notifTarget(notif, currentUser));",
      'notif:fb-page');

    s = rep(s,
      "navigate(notif.postId ? `/post/${notif.postId}` : '/');",
      "navigate(notif.postId ? `/post/${notif.postId}` : notifTarget(notif, currentUser));",
      'notif:fb-mention');

    s = rep(s,
      "navigate(notif.postId?`/post/${notif.postId}`:'/');",
      "navigate(notif.postId?`/post/${notif.postId}`:notifTarget(notif, currentUser));",
      'notif:fb-post');

    // friendRequest / friendAccepted : arovana raha tsy misy fromUid
    s = rep(s,
      "      case 'friendRequest': case 'friendAccepted':\n        navigate(`/profile/${notif.fromUid}`);\n        break;",
      "      case 'friendRequest': case 'friendAccepted':\n        navigate(notif.fromUid ? `/profile/${notif.fromUid}` : notifTarget(notif, currentUser));\n        break;",
      'notif:fb-friend');

    // 'general' voafaritra mazava (mba tsy hiankina amin'ny default)
    s = rep(s,
      "      case 'friendRequest': case 'friendAccepted':\n        navigate(notif.fromUid ? `/profile/${notif.fromUid}` : notifTarget(notif, currentUser));\n        break;",
      `      case 'friendRequest': case 'friendAccepted':
        navigate(notif.fromUid ? \`/profile/\${notif.fromUid}\` : notifTarget(notif, currentUser));
        break;
      case 'general':
        navigate(notifTarget(notif, currentUser));
        break;`,
      'notif:general');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   B — Fanampiana `link` amin'ny toerana fanoratana (notification VAOVAO)
   ═══════════════════════════════════════════════════════════════════════════ */

/* B1 — GroupPage : ajout amin'ny groupe */
{
  const rel = 'src/pages/GroupPage.jsx';
  let s = load(rel);
  if (s.includes("link: `/groups/")) {
    console.log('  ⏭  GroupPage.jsx : efa voapatch');
  } else {
    s = rep(s,
      "        type: 'general', message: `${userProfile.fullName} vous a ajouté(e) au groupe ${group.name}`,",
      "        type: 'general', link: `/groups/${groupId}`,\n        message: `${userProfile.fullName} vous a ajouté(e) au groupe ${group.name}`,",
      'group:link');
    save(rel, s);
  }
}

/* B2 — Messages : ajout amin'ny discussion */
{
  const rel = 'src/pages/Messages.jsx';
  let s = load(rel);
  if (s.includes('link: `/messages/group_')) {
    console.log('  ⏭  Messages.jsx : efa voapatch');
  } else {
    const OLD = "type: 'general', message: `${userProfile.fullName} vous a ajouté(e) à la discussion";
    const NEW = "type: 'general', link: `/messages/group_${activeGroup.id}`,\n        message: `${userProfile.fullName} vous a ajouté(e) à la discussion";
    s = rep(s, OLD, NEW, 'messages:link');
    save(rel, s);
  }
}

/* B3 — AdminPanel : VIP activé / refusé / boost refusé */
{
  const rel = 'src/pages/AdminPanel.jsx';
  let s = load(rel);
  if (s.includes("link: '/vip'")) {
    console.log('  ⏭  AdminPanel.jsx : efa voapatch');
  } else {
    s = rep(s,
      "          type: 'general', message: 'Votre compte VIP a ete active. Bienvenue !',",
      "          type: 'general', link: '/vip',\n          message: 'Votre compte VIP a ete active. Bienvenue !',",
      'admin:vip-ok');

    s = rep(s,
      "          type: 'general', message: 'Votre demande de compte VIP a ete refusee.',",
      "          type: 'general', link: '/vip',\n          message: 'Votre demande de compte VIP a ete refusee.',",
      'admin:vip-ko');

    // Boost refusé → mankany amin'ny cible (post/profil/boutique/artiste)
    s = rep(s,
      "          type: 'general', message: `Votre commande de boost a été refusée.`,",
      `          type: 'general',
          link: order.targetType === 'post'    ? \`/post/\${order.targetId}\`
              : order.targetType === 'profile' ? \`/profile/\${order.targetId}\`
              : order.targetType === 'shop'    ? \`/shop/\${order.targetId}\`
              : order.targetType === 'artist'  ? \`/artists/\${order.targetId}\`
              : '/boost',
          message: \`Votre commande de boost a été refusée.\`,`,
      'admin:boost');

    save(rel, s);
  }
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
