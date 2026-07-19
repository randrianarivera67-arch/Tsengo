// patch-optimistic-post.cjs  (FRONTEND — src/pages/Home.jsx)
// Olana : ny publication vaovao (serverTimestamp null aloha) dia tsy tafiditra
// avy hatrany amin'ny orderBy('createdAt') → "tsy hita" vetivety.
// Vahaolana : OPTIMISTIC INSERT — aseho eo an-tampon'ny feed avy hatrany aorian'ny
// addDoc (createdAt estimé), dia ny listener realtime no manavao azy amin'ny id.
// Idempotent + anchor unique guards.
const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');
let changed = 0;

// Site 1 : publishPost (média unique + texte)
const OLD1 = `      const postRef = await addDoc(collection(db, 'posts'), {
        ...fields, mediaURL, mediaType: finalMT, thumbURL,
        reactions: {}, comments: [], createdAt: serverTimestamp(),
      });`;
const NEW1 = `      const postRef = await addDoc(collection(db, 'posts'), {
        ...fields, mediaURL, mediaType: finalMT, thumbURL,
        reactions: {}, comments: [], createdAt: serverTimestamp(),
      });
      // Aseho avy hatrany (optimistic) — averin'ny listener realtime amin'ny id
      setFeedRaw(prev => [{ id: postRef.id, ...fields, mediaURL, mediaType: finalMT, thumbURL, reactions: {}, comments: [], createdAt: { seconds: Math.floor(Date.now() / 1000) } }, ...prev.filter(x => x.id !== postRef.id)]);
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60);`;

// Site 2 : multiPhotos
const OLD2 = `        const postRef = await addDoc(collection(db, 'posts'), {
          ...fields, mediaURL: urls[0], mediaType: 'image', mediaURLs: urls, thumbURL: '',
          reactions: {}, comments: [], createdAt: serverTimestamp(),
        });`;
const NEW2 = `        const postRef = await addDoc(collection(db, 'posts'), {
          ...fields, mediaURL: urls[0], mediaType: 'image', mediaURLs: urls, thumbURL: '',
          reactions: {}, comments: [], createdAt: serverTimestamp(),
        });
        // Aseho avy hatrany (optimistic)
        setFeedRaw(prev => [{ id: postRef.id, ...fields, mediaURL: urls[0], mediaType: 'image', mediaURLs: urls, thumbURL: '', reactions: {}, comments: [], createdAt: { seconds: Math.floor(Date.now() / 1000) } }, ...prev.filter(x => x.id !== postRef.id)]);
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60);`;

for (const [label, oldStr, newStr] of [['optimistic publishPost', OLD1, NEW1], ['optimistic multiPhotos', OLD2, NEW2]]) {
  if (s.includes(newStr)) { console.log('  ⏭️  ' + label + ' — deja applique'); continue; }
  const n = s.split(oldStr).length - 1;
  if (n !== 1) { console.log('  ❌ ' + label + ' — ancre introuvable/multiple (' + n + ')'); process.exit(1); }
  s = s.replace(oldStr, newStr); changed++; console.log('  ✅ ' + label);
}

if (changed) fs.writeFileSync(p, s);
console.log('✅ Optimistic insert apetraka — publication vaovao hita AVY HATRANY.');
