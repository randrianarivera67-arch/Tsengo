// patch-fix-loadmore.cjs (FRONTEND — src/pages/Home.jsx)
// BUG CRITIQUE : quand le feed est vide/en chargement, le sentinel "Chargement…"
// est visible → l'IntersectionObserver déclenche loadFeedPage() → feedLimit grandit
// (30→60→90…) → re-subscription onSnapshot en boucle → quota épuisé → feed bloqué.
// FIX :
//   1. Pas de sentinel tant que postsLoading (chargement initial).
//   2. Charger plus SEULEMENT si une page pleine est déjà reçue (feedRaw.length >= feedLimit).
const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');

const OLD = `        if (feedLen <= visibleCount && reachedEnd) return null;
        return (
          <div ref={el => {
            if (!el) return;
            const io = new IntersectionObserver(es => {
              if (!es[0].isIntersecting) return;
              // 1) On revele plus de posts deja charges.
              setVisibleCount(c => c + 26);
              // 2) Si on approche de la limite serveur actuelle, on en demande plus.
              if (!reachedEnd) loadFeedPage();
            }, { rootMargin: '1600px' });
            io.observe(el);
          }}`;

const NEW = `        if (postsLoading || (feedLen <= visibleCount && reachedEnd)) return null;
        return (
          <div ref={el => {
            if (!el) return;
            const io = new IntersectionObserver(es => {
              if (!es[0].isIntersecting) return;
              // 1) On revele plus de posts deja charges.
              setVisibleCount(c => c + 26);
              // 2) Charger plus SEULEMENT si une page pleine est deja recue (evite la boucle infinie).
              if (!reachedEnd && feedRaw.length >= feedLimit) loadFeedPage();
            }, { rootMargin: '1200px' });
            io.observe(el);
          }}`;

if (s.includes('feedRaw.length >= feedLimit) loadFeedPage()')) { console.log('⏭️  deja applique'); process.exit(0); }
if (s.split(OLD).length - 1 !== 1) { console.log('❌ ancre introuvable (' + (s.split(OLD).length-1) + ')'); process.exit(1); }
s = s.replace(OLD, NEW);
fs.writeFileSync(p, s);
console.log('✅ Boucle infinie load-more corrigee (feed ne se bloque plus).');
