const fs = require("fs");
process.chdir(__dirname);
const done = [];

// ─── 1) App.jsx : import + route ──────────────────────────
let A = fs.readFileSync("src/App.jsx", "utf8");
if (!A.includes("ArtistsAll")) {
  A = A.replace(
    "const ArtistMessages     = lazy(() => import('./pages/ArtistMessages'));",
    "const ArtistMessages     = lazy(() => import('./pages/ArtistMessages'));\nconst ArtistsAll         = lazy(() => import('./pages/ArtistsAll'));"
  );
  const anchor = '<Route path="/artists/:artistId" element={<PrivateRoute><Layout><ArtistDetail /></Layout></PrivateRoute>} />';
  A = A.replace(anchor,
    '<Route path="/artists/all/:type" element={<PrivateRoute><Layout><ArtistsAll /></Layout></PrivateRoute>} />\n        ' + anchor
  );
  fs.writeFileSync("src/App.jsx", A);
  done.push("App.jsx : import + route /artists/all/:type");
} else { done.push("App.jsx : déjà fait"); }

// ─── 2) Artists.jsx : "Voir tout" cliquable ───────────────
let S = fs.readFileSync("src/pages/Artists.jsx", "utf8");

const oldSecHd = `  const secHd = (title, count) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 8px' }}>
      <span style={{ fontWeight: 800, fontSize: 17, color: '#050505' }}>{title}</span>
      {count > 3 && <span style={{ color: '#FF2D8D', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center' }}>Voir tout <HiChevronRight size={15} /></span>}
    </div>
  );`;
const newSecHd = `  const secHd = (title, count, type) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 8px' }}>
      <span style={{ fontWeight: 800, fontSize: 17, color: '#050505' }}>{title}</span>
      {count > 0 && (
        <button onClick={() => navigate(\`/artists/all/\${type}\`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF2D8D', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', padding: 0 }}>
          Voir tout <HiChevronRight size={15} />
        </button>
      )}
    </div>
  );`;
if (S.includes(oldSecHd)) { S = S.replace(oldSecHd, newSecHd); done.push("Artists.jsx : secHd cliquable"); }

// passer le type à chaque appel
const calls = [
  [`{secHd(low ? 'Artistes' : "Suggestions d'artistes", fArtists.length)}`, `{secHd(low ? 'Artistes' : "Suggestions d'artistes", fArtists.length, 'artists')}`],
  [`{secHd('Musiques pour vous', fTracks.length)}`, `{secHd('Musiques pour vous', fTracks.length, 'music')}`],
  [`{secHd('Vidéos / Clips / Articles', fVideos.length)}`, `{secHd('Vidéos / Clips / Articles', fVideos.length, 'videos')}`],
];
calls.forEach(([o, n]) => { if (S.includes(o)) { S = S.replace(o, n); } });
done.push("Artists.jsx : type passé aux 3 sections");

fs.writeFileSync("src/pages/Artists.jsx", S);

console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));
