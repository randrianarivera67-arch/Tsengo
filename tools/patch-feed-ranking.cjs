// patch-feed-ranking.cjs  (FRONTEND — src/pages/Home.jsx)
// Ranking feed : récent = priorité, dia vues + réactions + boutique/groupe mihodina.
// Recency dominant (post vaovao ambony), engagement + jitter = variation.
const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');
const OLD = `    const scoreOf = (pp) => {
      const boosted = pp.isBoosted && pp.boostUntil && new Date(pp.boostUntil) > nowD
        && isInZones(viewerLoc?.lat, viewerLoc?.lng, pp.boostZones);
      const hoursAgo = (nowMs - tsMs(pp.createdAt)) / 3600000;
      const mine = pp.uid === currentUser?.uid ? 30 : 0;
      return (boosted ? 1e6 : 0) - hoursAgo + mine + (aff.has(pp.uid) ? 14 : 0) + rnd(pp.id) * 8;
    };`;
const NEW = `    const scoreOf = (pp) => {
      const boosted = pp.isBoosted && pp.boostUntil && new Date(pp.boostUntil) > nowD
        && isInZones(viewerLoc?.lat, viewerLoc?.lng, pp.boostZones);
      const hoursAgo = (nowMs - tsMs(pp.createdAt)) / 3600000;
      const mine = pp.uid === currentUser?.uid ? 40 : 0;          // mon post = tres haut
      const friend = aff.has(pp.uid) ? 12 : 0;                    // amis/following
      const reacts = Object.keys(pp.reactions || {}).length;      // popularité réactions
      const vues = Math.min(pp.views || 0, 300);                  // popularité vues (capé)
      const shopGroup = (pp.shopId || pp.groupId || pp.isShop || pp.artistId) ? rnd(pp.id + 'sg') * 10 : 0; // boutique/groupe/artiste mihodina
      const engage = reacts * 1.2 + vues * 0.02;                  // engagement
      return (boosted ? 1e6 : 0)
        - hoursAgo * 1.5           // récence = dominant (post vaovao ambony)
        + mine + friend + engage + shopGroup
        + rnd(pp.id) * 7;          // jitter = variation isaky ny refresh
    };`;
if (s.includes('friend = aff.has(pp.uid) ? 12')) { console.log('SKIP deja'); process.exit(0); }
if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre (' + (s.split(OLD).length-1) + ') - patch-own-priority nampiharina?'); process.exit(1); }
s = s.replace(OLD, NEW);
fs.writeFileSync(p, s);
console.log('OK ranking: recent > vues/reactions/boutique/groupe + variation');
