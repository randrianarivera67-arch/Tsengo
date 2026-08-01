// src/utils/commentThread.js
// Logika MADIO ho an'ny panneau commentaire — azo tsapaina 100 % amin'ny Node.
//
// ⚠️ Ny commentaire TALOHA dia tsy manana `parentId` (voamarina tao amin'ny
// code : { id, uid, authorName, authorPhoto, authorIsVip, text, mediaURL,
// mediaType, createdAt }). Ka ny tsy misy `parentId` dia raisina ho
// commentaire fototra — tsy misy migration, tsy misy very.

/** Isan'ny réaction amin'ny commentaire iray. */
export function reactCount(c) {
  return Object.keys((c && c.reactions) || {}).length;
}

/** Daty → nombre, azo alahatra. Mandray ISO string na Firestore Timestamp. */
export function timeOf(c) {
  const v = c && c.createdAt;
  if (!v) return 0;
  if (typeof v === 'string') { const t = Date.parse(v); return isNaN(t) ? 0 : t; }
  if (typeof v === 'number') return v;
  if (typeof v.toDate === 'function') { try { return v.toDate().getTime(); } catch { return 0; } }
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  return 0;
}

/**
 * Mandahatra ny commentaire fototra.
 *   'top'    → « Plus pertinents » : réaction be indrindra, dia ny valiny be
 *              indrindra, dia ny tranainy indrindra (toy ny Facebook).
 *   'recent' → vaovao indrindra aloha.
 *   'old'    → tranainy indrindra aloha.
 */
export function sortComments(list, mode = 'top', repliesOf = null) {
  const arr = [...(list || [])];
  const nRep = (c) => (repliesOf && repliesOf.get ? (repliesOf.get(c.id) || []).length : 0);
  if (mode === 'recent') return arr.sort((a, b) => timeOf(b) - timeOf(a));
  if (mode === 'old')    return arr.sort((a, b) => timeOf(a) - timeOf(b));
  return arr.sort((a, b) =>
    (reactCount(b) - reactCount(a)) ||
    (nRep(b) - nRep(a)) ||
    (timeOf(a) - timeOf(b))
  );
}

/**
 * Manangana ny fil : commentaire fototra + valiny.
 *
 * @param {object[]} comments
 * @param {'top'|'recent'|'old'} mode
 * @returns {{roots: object[], repliesOf: Map<string, object[]>, total: number}}
 *
 * FIAROVANA :
 *  • `parentId` manondro commentaire tsy misy → raisina ho FOTOTRA (tsy very).
 *  • Boucle (a→b→a) → tapahina, raisina ho fototra.
 *  • Ny valiny dia alahatra araka ny daty FOANA (toy ny Facebook).
 */
export function buildThread(comments, mode = 'top') {
  const list = Array.isArray(comments) ? comments.filter(c => c && c.id) : [];
  const byId = new Map(list.map(c => [c.id, c]));
  const repliesOf = new Map();
  const roots = [];

  for (const c of list) {
    // Fanamarinana ny fototra : mialoha ny boucle sy ny ray tsy misy
    let pid = c.parentId;
    if (pid) {
      const seen = new Set([c.id]);
      let cur = pid;
      while (cur && byId.has(cur) && !seen.has(cur)) { seen.add(cur); cur = byId.get(cur).parentId; }
      if (cur && seen.has(cur)) pid = null;            // boucle → fototra
      else if (!byId.has(c.parentId)) pid = null;      // ray tsy misy → fototra
    }
    if (pid) {
      if (!repliesOf.has(pid)) repliesOf.set(pid, []);
      repliesOf.get(pid).push(c);
    } else {
      roots.push(c);
    }
  }

  for (const [k, v] of repliesOf) repliesOf.set(k, v.sort((a, b) => timeOf(a) - timeOf(b)));
  return { roots: sortComments(roots, mode, repliesOf), repliesOf, total: list.length };
}

/** Azo ovaina/fafana ve ity commentaire ity ? */
export function canEdit(c, meUid) { return !!c && !!meUid && c.uid === meUid; }
export function canDelete(c, meUid, postUid) {
  return !!c && !!meUid && (c.uid === meUid || postUid === meUid);
}
