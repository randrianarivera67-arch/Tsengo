const fs = require("fs");
process.chdir(__dirname);
const done = [];

function edit(path, fn) {
  if (!fs.existsSync(path)) { console.log("⚠️ absent:", path); return; }
  let s = fs.readFileSync(path, "utf8");
  const out = fn(s);
  if (out) fs.writeFileSync(path, out);
}

const SENTINEL = (countVar, setCountVar, totalExpr) => `
      {${totalExpr} > ${countVar} && (
        <div ref={el => {
          if (!el) return;
          const io = new IntersectionObserver(es => { if (es[0].isIntersecting) set${setCountVar}(c => c + 10); }, { rootMargin: '400px' });
          io.observe(el);
        }} style={{ padding: 18, textAlign: 'center', color: '#65676B', fontSize: 13 }}>
          Chargement…
        </div>
      )}`;

// ═══ 1) Notes : bouton d'ajout de photo ═══
edit("src/pages/Notes.jsx", s => {
  if (!s.includes("useRef")) {
    s = s.replace(/import \{ useState, useEffect \}/, "import { useState, useEffect, useRef }");
    done.push("Notes : import useRef");
  }
  if (!s.includes("notePhotoRef")) {
    s = s.replace("  const [saving, setSaving] = useState(false);",
                  "  const [saving, setSaving] = useState(false);\n  const notePhotoRef = useRef(null);");
    done.push("Notes : ref photo");
  }
  if (!/HiPhotograph/.test(s.split("from 'react-icons/hi'")[0])) {
    s = s.replace(/(\n?\} from 'react-icons\/hi';)/, ", HiPhotograph$1");
    done.push("Notes : import HiPhotograph");
  }
  const m = s.match(/<textarea[\s\S]{0,400}?value=\{editing\.body\}[\s\S]*?\/>/);
  if (m && !s.includes("notePhotoRef.current")) {
    const block = `<div style={{ marginBottom: 10 }}>
              <input ref={notePhotoRef} type="file" accept="image/*"
                onChange={e => { const f = e.target.files[0]; if (f) setEditing(p => ({ ...p, photoFile: f, photoPreview: URL.createObjectURL(f) })); }}
                style={{ display: 'none' }} />
              {(editing.photoPreview || editing.photoURL) && (
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <img src={editing.photoPreview || editing.photoURL} alt="" style={{ width: '100%', maxHeight: 190, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
                  <button onClick={() => setEditing(p => ({ ...p, photoFile: null, photoPreview: null, photoURL: '' }))}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', cursor: 'pointer' }}>✕</button>
                </div>
              )}
              <button onClick={() => notePhotoRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0F2F5', border: 'none', borderRadius: 20, padding: '9px 15px', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: '#050505', fontFamily: 'Poppins' }}>
                <HiPhotograph size={18} color="#12A48D" /> {(editing.photoPreview || editing.photoURL) ? 'Changer la photo' : 'Ajouter une photo'}
              </button>
            </div>
            ` + m[0];
    s = s.replace(m[0], block);
    done.push("Notes : bouton Ajouter une photo");
  }
  return s;
});

// ═══ 2) Home : pré-chargement 60, affichage 10 puis +10 ═══
edit("src/pages/Home.jsx", s => {
  if (s.includes("orderBy('createdAt', 'desc'), limit(20)")) {
    s = s.replace("orderBy('createdAt', 'desc'), limit(20)", "orderBy('createdAt', 'desc'), limit(60)");
    done.push("Home : pré-chargement 60 publications");
  }
  if (!s.includes("const [visibleCount")) {
    const decl = "  const [visibleCount, setVisibleCount] = useState(10);   // affichage progressif\n";
    if (s.includes("  const [expandedPosts, setExpandedPosts] = useState({});")) {
      s = s.replace("  const [expandedPosts, setExpandedPosts] = useState({});", decl + "  const [expandedPosts, setExpandedPosts] = useState({});");
      done.push("Home : state visibleCount");
    } else if (s.includes("  const [posts, setPosts]           = useState([]);")) {
      s = s.replace("  const [posts, setPosts]           = useState([]);", "  const [posts, setPosts]           = useState([]);\n" + decl.trimEnd());
      done.push("Home : state visibleCount (fallback)");
    }
  }
  const oldMap = "      {posts.filter(p => !(p.mediaType === 'audio' && p.isMusic)).map((post, pIdx) => {";
  const newMap = "      {posts.filter(p => !(p.mediaType === 'audio' && p.isMusic)).slice(0, visibleCount).map((post, pIdx) => {";
  if (s.includes(oldMap)) { s = s.replace(oldMap, newMap); done.push("Home : affichage limité à visibleCount"); }

  const anchorEnd = "      {shareModalPost && <ShareModal";
  if (s.includes(anchorEnd) && !s.includes("setVisibleCount(c => c + 10)")) {
    s = s.replace(anchorEnd, SENTINEL("visibleCount", "VisibleCount", "posts.filter(p => !(p.mediaType === 'audio' && p.isMusic)).length") + "\n\n" + anchorEnd);
    done.push("Home : chargement au scroll");
  }
  return s;
});

// ═══ 3) Profile : idem ═══
edit("src/pages/Profile.jsx", s => {
  if (s.includes("orderBy('createdAt','desc'), limit(30)")) {
    s = s.replace("orderBy('createdAt','desc'), limit(30)", "orderBy('createdAt','desc'), limit(60)");
    done.push("Profile : pré-chargement 60");
  }
  if (!s.includes("visibleCount")) {
    s = s.replace("  const [posts,          setPosts]       = useState([]);",
                  "  const [posts,          setPosts]       = useState([]);\n  const [visibleCount,   setVisibleCount] = useState(10);");
    done.push("Profile : state visibleCount");
  }
  const old = "            : getTabContent().map(post => renderPost(post))";
  const neu = `            : (<>
                {getTabContent().slice(0, visibleCount).map(post => renderPost(post))}
                {getTabContent().length > visibleCount && (
                  <div ref={el => { if (!el) return; const io = new IntersectionObserver(es => { if (es[0].isIntersecting) setVisibleCount(c => c + 10); }, { rootMargin: '400px' }); io.observe(el); }}
                    style={{ padding: 18, textAlign: 'center', color: '#65676B', fontSize: 13 }}>Chargement…</div>
                )}
              </>)`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("Profile : affichage progressif"); }
  return s;
});

// ═══ 4) GroupPage : idem ═══
edit("src/pages/GroupPage.jsx", s => {
  if (!s.includes("visibleCount")) {
    const m = s.match(/^\s*const \[posts,\s*setPosts\][^\n]*$/m);
    if (m) { s = s.replace(m[0], m[0] + "\n  const [visibleCount, setVisibleCount] = useState(10);"); done.push("GroupPage : state visibleCount"); }
  }
  const old = "      {posts.map(post => {";
  const neu = `      {posts.slice(0, visibleCount).map(post => {`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("GroupPage : affichage limite"); }
  // sentinelle de chargement
  if (s.includes("{posts.slice(0, visibleCount).map(post => {") && !s.includes("setVisibleCount(c => c + 10)")) {
    const tail = s.lastIndexOf("    </div>\n  );\n}");
    if (tail > 0) {
      s = s.slice(0, tail) + `      {posts.length > visibleCount && (
        <div ref={el => { if (!el) return; const io = new IntersectionObserver(es => { if (es[0].isIntersecting) setVisibleCount(c => c + 10); }, { rootMargin: '400px' }); io.observe(el); }}
          style={{ padding: 18, textAlign: 'center', color: '#65676B', fontSize: 13 }}>Chargement…</div>
      )}
` + s.slice(tail);
      done.push("GroupPage : chargement au scroll");
    }
  }
  return s;
});

console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));

let ok = true;
const n = fs.readFileSync("src/pages/Notes.jsx", "utf8");
if (!n.split("from 'react-icons/hi'")[0].includes("HiPhotograph")) { console.log("❌ Notes : HiPhotograph non importé"); ok = false; }
if (!n.includes("notePhotoRef.current")) { console.log("❌ Notes : bouton photo non inséré"); ok = false; }
const hh = fs.readFileSync("src/pages/Home.jsx", "utf8");
if (hh.includes("visibleCount") && !hh.includes("const [visibleCount")) { console.log("❌ Home : visibleCount utilise mais non declare"); ok = false; }
const pf = fs.readFileSync("src/pages/Profile.jsx", "utf8");
if (pf.includes("visibleCount") && !pf.includes("const [visibleCount")) { console.log("❌ Profile : visibleCount utilise mais non declare"); ok = false; }
const gp = fs.readFileSync("src/pages/GroupPage.jsx", "utf8");
if (gp.includes("visibleCount") && !gp.includes("const [visibleCount")) { console.log("❌ GroupPage : visibleCount utilise mais non declare"); ok = false; }
if (done.length < 9) { console.log("❌ Seulement " + done.length + " appliquees"); ok = false; }
console.log(ok ? "\n✅ Verifications OK — tu peux builder." : "\n❌ ARRET : previens-moi.");
if (!ok) process.exit(1);
