// src/components/ScrollReveal.jsx
// Effet "ressort" à l'apparition : chaque carte (.card / .post-card) surgit
// avec un rebond élastique quand elle entre dans l'écran pendant le défilement.
//
// Monté UNE SEULE FOIS (dans Layout) : couvre automatiquement le fil, le profil,
// les groupes, boutiques, artistes, notes, événements, enregistrements, etc.
// sans modifier aucune page.
//
// Sécurité : si l'IntersectionObserver ne se déclenche jamais (conteneur masqué,
// navigateur exotique...), un filet de sécurité révèle la carte au bout de 1,2 s
// — le contenu ne peut donc JAMAIS rester invisible.
import { useEffect } from 'react';

const SAFETY_MS = 1200;

export default function ScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch (e) { /* ignore */ }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.04 }
    );

    const seen = new WeakSet();

    function reveal(el) {
      el.classList.add('reveal-in');
    }

    function scan() {
      let els;
      try { els = document.querySelectorAll('.card, .post-card'); } catch (e) { return; }
      els.forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        el.classList.add('reveal-init');
        io.observe(el);
        // filet de sécurité : jamais de contenu invisible
        setTimeout(() => {
          if (!el.classList.contains('reveal-in')) { reveal(el); try { io.unobserve(el); } catch (e) {} }
        }, SAFETY_MS);
      });
    }

    scan();

    // Les cartes arrivent en continu (Firestore temps réel, pagination...) :
    // on rescanne, mais de façon groupée pour ne pas peser sur le défilement.
    let raf = null;
    const mo = new MutationObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; scan(); });
    });
    try { mo.observe(document.body, { childList: true, subtree: true }); } catch (e) { /* ignore */ }

    return () => {
      io.disconnect();
      mo.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
