/**
 * patch-linkify-posts.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 * BUT : ny LIEN ao anaty PUBLICATION sy COMMENTAIRE dia lasa clicable.
 *       NY LIEN IHANY no clicable — ny sisin-lahatsoratra dia mitovy amin'ny
 *       teo aloha (misokatra ny publication / mandeha ny video / sns.).
 *       Ny Linkify efa misy (ampiasain'ny Messages) no averina ampiasaina —
 *       tsy misy composant vaovao.
 *
 * FANAMPINY (étape 0) : fanitsiana `splitLinks` — ny mari-piatoana any amin'ny
 *       farany ("...com." , "(...com)") dia tsy tafiditra ao anaty lien intsony.
 *       Zava-dehibe izany satria ny publication dia FEHEZANTENY, tsy toy ny chat.
 *
 * FIAROVANA :
 *   - assertion s.count(old) === 1 amin'ny fanoloana 22
 *   - fanamarinana doublon amin'ny import
 *   - idempotent
 *
 * FICHIERS :
 *   src/utils/appLink.js
 *   src/pages/Home.jsx, PostDetail.jsx, Profile.jsx, GroupPage.jsx, Reels.jsx
 *   src/components/MediaViewer.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');

const P = (rel) => path.join(ROOT, rel);
function read(f) {
  if (!fs.existsSync(f)) throw new Error('FICHIER TSY HITA : ' + f);
  return fs.readFileSync(f, 'utf8');
}
const countOf = (s, sub) => s.split(sub).length - 1;

function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error(
      'ASSERTION FAIL [' + label + '] : nandrasana 1 fiseho, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 240) + '\n-----------'
    );
  }
  return src.replace(old, neo);
}

/** Ampidiro ny import Linkify aorian'ny lign-teny voalohany (unique isaky ny fichier). */
function addImport(src, headerLine, label) {
  if (/^import Linkify from/m.test(src)) return src;              // efa misy
  if (countOf(src, "from '../components/Linkify'") > 0) return src;
  if (countOf(src, "from './Linkify'") > 0) return src;
  const rel = label.startsWith('components/') ? './Linkify' : '../components/Linkify';
  return rep(src, headerLine, headerLine + "\nimport Linkify from '" + rel + "';", label + ':import');
}

const files = {};   // rel → content
const touched = [];
function load(rel) { if (!files[rel]) files[rel] = read(P(rel)); return files[rel]; }
function save(rel, s) { files[rel] = s; if (!touched.includes(rel)) touched.push(rel); }

/* ═══════════════════════════════════════════════════════════════════════════
   ÉTAPE 0 — appLink.js : ny mari-piatoana farany tsy tafiditra ao anaty lien
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/utils/appLink.js';
  let s = load(rel);
  if (s.includes('export function trimUrlTail')) {
    console.log('  ⏭  appLink.js : efa voapatch');
  } else {
    const OLD = `/** Mizara ny lahatsoratra ho ampahany : { type: 'text'|'link', value, internal } */
export function splitLinks(text) {
  if (!text) return [];
  const urlRe = /(https?:\\/\\/[^\\s]+|www\\.[^\\s]+)/gi;
  const parts = [];
  let last = 0, m;
  while ((m = urlRe.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
    const raw = m[0];
    parts.push({ type: 'link', value: raw, internal: parseAppLink(raw) });
    last = m.index + raw.length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts.length ? parts : [{ type: 'text', value: text }];
}`;

    const NEW = `/**
 * Manaisotra ny mari-piatoana any amin'ny FARAN'ny URL ("…com." , "(…com)" , "…com!").
 * Tazonina kosa ny fonosana mifandanja : ".../Foo_(bar)" dia tsy tapahina.
 */
export function trimUrlTail(raw) {
  let url = String(raw == null ? '' : raw);
  const bal = (open, close) =>
    (url.split(open).length - 1) - (url.split(close).length - 1);
  for (let guard = 0; guard < 200 && url.length; guard++) {
    const last = url[url.length - 1];
    if ('.,;:!?\\u2026\\u00AB\\u00BB"\\'\\u201C\\u201D'.indexOf(last) !== -1) { url = url.slice(0, -1); continue; }
    if (last === ')' && bal('(', ')') < 0) { url = url.slice(0, -1); continue; }
    if (last === ']' && bal('[', ']') < 0) { url = url.slice(0, -1); continue; }
    if (last === '}' && bal('{', '}') < 0) { url = url.slice(0, -1); continue; }
    break;
  }
  return url;
}

/** Mizara ny lahatsoratra ho ampahany : { type: 'text'|'link', value, internal } */
export function splitLinks(text) {
  if (!text) return [];
  const urlRe = /(https?:\\/\\/[^\\s]+|www\\.[^\\s]+)/gi;
  const parts = [];
  let last = 0, m;
  while ((m = urlRe.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
    const raw = m[0];
    const url = trimUrlTail(raw);
    if (url) parts.push({ type: 'link', value: url, internal: parseAppLink(url) });
    const tail = raw.slice(url.length);
    if (tail) parts.push({ type: 'text', value: tail });
    last = m.index + raw.length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts.length ? parts : [{ type: 'text', value: text }];
}`;

    s = rep(s, OLD, NEW, 'appLink:splitLinks');
    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   1 — Home.jsx : contenu publication + partage + commentaire
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = load(rel);
  if (s.includes("<Linkify text={post.content}")) {
    console.log('  ⏭  Home.jsx : efa voapatch');
  } else {
    s = addImport(s, '// src/pages/Home.jsx', 'Home');

    // contenu (mitovy ny <p> ho an'ny textBg sy ny mahazatra → loko miankina)
    s = rep(s,
      '>{post.content}</p>',
      "><Linkify text={post.content} color={post.textBg ? '#FFFFFF' : '#1877F2'} /></p>",
      'Home:content');

    // publication nozaraina
    s = rep(s,
      "{post.sharedFrom.content && <p style={{ padding:'0 12px 8px', fontSize:13, color:'#050505' }}>{post.sharedFrom.content}</p>}",
      "{post.sharedFrom.content && <p style={{ padding:'0 12px 8px', fontSize:13, color:'#050505' }}><Linkify text={post.sharedFrom.content} /></p>}",
      'Home:shared');

    // commentaire
    s = rep(s,
      "{c.text&&<p style={{ fontSize:14, wordBreak:'break-word' }}>{c.text}</p>}",
      "{c.text&&<p style={{ fontSize:14, wordBreak:'break-word' }}><Linkify text={c.text} /></p>}",
      'Home:comment');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2 — PostDetail.jsx : contenu (2 endrika) + partage + commentaire
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/PostDetail.jsx';
  let s = load(rel);
  if (s.includes('<Linkify text={post.content')) {
    console.log('  ⏭  PostDetail.jsx : efa voapatch');
  } else {
    s = addImport(s, '// src/pages/PostDetail.jsx', 'PostDetail');

    s = rep(s,
      "{post.content && <p style={{ fontSize:15, lineHeight:1.7, wordBreak:'break-word', marginTop:12 }}>{post.content}</p>}",
      "{post.content && <p style={{ fontSize:15, lineHeight:1.7, wordBreak:'break-word', marginTop:12 }}><Linkify text={post.content} /></p>}",
      'PostDetail:content-a');

    s = rep(s,
      "borderRadius:8 }}>{post.content}</p> : <p style={{ fontSize:15, lineHeight:1.7, wordBreak:'break-word', marginBottom:10 }}>{post.content}</p>",
      "borderRadius:8 }}><Linkify text={post.content} color=\"#FFFFFF\" /></p> : <p style={{ fontSize:15, lineHeight:1.7, wordBreak:'break-word', marginBottom:10 }}><Linkify text={post.content} /></p>",
      'PostDetail:content-b');

    s = rep(s,
      "{post.sharedFrom.content && <p style={{ padding:'0 12px 8px', fontSize:13, color:'#050505' }}>{post.sharedFrom.content}</p>}",
      "{post.sharedFrom.content && <p style={{ padding:'0 12px 8px', fontSize:13, color:'#050505' }}><Linkify text={post.sharedFrom.content} /></p>}",
      'PostDetail:shared');

    s = rep(s,
      "{c.text&&<p style={{ fontSize:13, lineHeight:1.5, marginTop:2 }}>{c.text}</p>}",
      "{c.text&&<p style={{ fontSize:13, lineHeight:1.5, marginTop:2 }}><Linkify text={c.text} /></p>}",
      'PostDetail:comment');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   3 — Profile.jsx : contenu (textBg + mahazatra) + partage + commentaire + viewer
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Profile.jsx';
  let s = load(rel);
  if (s.includes('<Linkify text={post.content')) {
    console.log('  ⏭  Profile.jsx : efa voapatch');
  } else {
    s = addImport(s, '// src/pages/Profile.jsx', 'Profile');

    s = rep(s,
      'borderRadius:8 }}>{post.content}</p>',
      'borderRadius:8 }}><Linkify text={post.content} color="#FFFFFF" /></p>',
      'Profile:content-textbg');

    s = rep(s,
      '              {post.content}\n            </p>',
      '              <Linkify text={post.content} />\n            </p>',
      'Profile:content-normal');

    s = rep(s,
      "{post.sharedFrom.content && <p style={{ padding:'0 12px 8px', fontSize:13, color:'#050505' }}>{post.sharedFrom.content}</p>}",
      "{post.sharedFrom.content && <p style={{ padding:'0 12px 8px', fontSize:13, color:'#050505' }}><Linkify text={post.sharedFrom.content} /></p>}",
      'Profile:shared');

    s = rep(s,
      '{c.text&&<span style={{ fontSize:13 }}>{c.text}</span>}',
      '{c.text&&<span style={{ fontSize:13 }}><Linkify text={c.text} /></span>}',
      'Profile:comment');

    s = rep(s,
      "<p style={{ fontSize:22,fontWeight:800,color:'white',textAlign:'center' }}>{selectedPost.content}</p>",
      "<p style={{ fontSize:22,fontWeight:800,color:'white',textAlign:'center' }}><Linkify text={selectedPost.content} color=\"#FFFFFF\" /></p>",
      'Profile:viewer-textbg');

    s = rep(s,
      "<p style={{ padding:'0 16px 10px',fontSize:15,lineHeight:1.6,wordBreak:'break-word' }}>{selectedPost.content}</p>",
      "<p style={{ padding:'0 16px 10px',fontSize:15,lineHeight:1.6,wordBreak:'break-word' }}><Linkify text={selectedPost.content} /></p>",
      'Profile:viewer-normal');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   4 — GroupPage.jsx : contenu + partage
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/GroupPage.jsx';
  let s = load(rel);
  if (s.includes('<Linkify text={post.content')) {
    console.log('  ⏭  GroupPage.jsx : efa voapatch');
  } else {
    s = addImport(s, "// src/pages/GroupPage.jsx — Page d'un groupe public (format Facebook)", 'GroupPage');

    s = rep(s,
      "borderRadius:8 }}>{post.content}</p> : <p style={{ fontSize: 15, lineHeight: 1.6, wordBreak: 'break-word' }}>{post.content}</p>",
      "borderRadius:8 }}><Linkify text={post.content} color=\"#FFFFFF\" /></p> : <p style={{ fontSize: 15, lineHeight: 1.6, wordBreak: 'break-word' }}><Linkify text={post.content} /></p>",
      'GroupPage:content');

    s = rep(s,
      "{post.sharedFrom.content && <p style={{ padding: '0 12px 8px', fontSize: 13, color: '#050505' }}>{post.sharedFrom.content}</p>}",
      "{post.sharedFrom.content && <p style={{ padding: '0 12px 8px', fontSize: 13, color: '#050505' }}><Linkify text={post.sharedFrom.content} /></p>}",
      'GroupPage:shared');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   5 — Reels.jsx : description video + commentaire (loko mazava amin'ny mainty)
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Reels.jsx';
  let s = load(rel);
  if (s.includes('<Linkify text={post.content')) {
    console.log('  ⏭  Reels.jsx : efa voapatch');
  } else {
    s = addImport(s, '// src/pages/Reels.jsx — TikTok style vertical scroll', 'Reels');

    s = rep(s,
      "overflow:'hidden' }}>{post.content}</p>",
      "overflow:'hidden' }}><Linkify text={post.content} color=\"#8ECBFF\" /></p>",
      'Reels:content');

    s = rep(s,
      "{c.text&&<span style={{ color:'white', fontSize:13 }}>{c.text}</span>}",
      "{c.text&&<span style={{ color:'white', fontSize:13 }}><Linkify text={c.text} color=\"#8ECBFF\" /></span>}",
      'Reels:comment');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   6 — MediaViewer.jsx : commentaire (fond mainty)
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/components/MediaViewer.jsx';
  let s = load(rel);
  if (s.includes('<Linkify text={c.text}')) {
    console.log('  ⏭  MediaViewer.jsx : efa voapatch');
  } else {
    s = addImport(s, '// src/components/MediaViewer.jsx', 'components/MediaViewer');

    s = rep(s,
      "{c.text && <p style={{ fontSize: 13.5, color: '#E4E6EB', wordBreak: 'break-word' }}>{c.text}</p>}",
      "{c.text && <p style={{ fontSize: 13.5, color: '#E4E6EB', wordBreak: 'break-word' }}><Linkify text={c.text} color=\"#8ECBFF\" /></p>}",
      'MediaViewer:comment');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   FANAMARINANA farany : tsy misy import Linkify miverina indroa
   ═══════════════════════════════════════════════════════════════════════════ */
for (const rel of touched) {
  const s = files[rel];
  const n = (s.match(/^import Linkify from/gm) || []).length;
  if (n > 1) throw new Error('IMPORT DOUBLON [' + rel + '] : ' + n + ' import Linkify');
}

if (!DRY) for (const rel of touched) fs.writeFileSync(P(rel), files[rel]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach((f) => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
