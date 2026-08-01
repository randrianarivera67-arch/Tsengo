/**
 * patch-comment-sheet-2.cjs   —  DINGANA 2 : PostDetail IHANY
 * ─────────────────────────────────────────────────────────────────────────────
 * Mampifandray ny `CommentSheet` amin'ny PostDetail. Sehatra IRAY ihany :
 * raha misy tsy mety dia `git revert` tokana, ary tsy voakasika ny Home,
 * Profile, Reels.
 *
 * FANOVANA :
 *  ① `replyTo` : chaîne (anarana) → OBJET { id, authorName }
 *     Ilaina mba hahazoana ny `parentId` — ny fil marina dia mitaky izany.
 *     Ny anarana irery dia tsy ampy : olona roa mitovy anarana dia mifangaro.
 *
 *  ② `addComment` : ampiana `parentId`
 *     Ny valiny dia mipetaka amin'ny commentaire FOTOTRA foana (toy ny
 *     Facebook : tsy misy fil lalina noho ny 2).
 *     ⚠️ Ny `@Anarana` teo aloha (ampiana amin'ny lahatsoratra) dia ESORINA :
 *     ny fil no maneho ny valiny izao, tsy ny lahatsoratra.
 *
 *  ③ Rendu : ny faritra commentaire manontolo (and. 371–420) soloina
 *     `<CommentSheet>`. Misokatra HO AZY rehefa tonga ao amin'ny pejy —
 *     mitovy amin'ny Facebook (tsindry commentaire → panneau miakatra).
 *
 * TSY VOAKASIKA : `submitViewerComment` (MediaViewer), ny réaction publication,
 *   ny partage, ny média. Ny Home / Profile / Reels dia tsy kitihina mihitsy.
 *
 * Fampandehanana :  node patch-comment-sheet-2.cjs --dry
 *                   node patch-comment-sheet-2.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/pages/PostDetail.jsx');
const DRY = process.argv.includes('--dry');

if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/pages/PostDetail.jsx'); process.exit(1); }
for (const dep of ['src/components/CommentSheet.jsx', 'src/utils/commentThread.js']) {
  if (!fs.existsSync(path.join(process.cwd(), dep))) {
    console.error('❌ Tsy hita : ' + dep + ' — alefaso aloha ny dingana 1.');
    process.exit(1);
  }
}

let s = fs.readFileSync(F, 'utf8');
if (s.includes('CommentSheet')) { console.log('⏭  PostDetail.jsx : efa voapatch'); process.exit(0); }

const countOf = (str, sub) => str.split(sub).length - 1;
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 220) + '\n-----------');
  }
  return src.replace(old, neo);
}

/* ── Import ─────────────────────────────────────────────────────────── */
s = rep(s,
  "import MentionPanel from '../components/MentionPanel';",
  "import MentionPanel from '../components/MentionPanel';\nimport CommentSheet from '../components/CommentSheet';",
  'import');

/* ── ① replyTo : objet ──────────────────────────────────────────────── */
s = rep(s,
  "  const [replyTo,       setReplyTo]    = useState(null);",
  "  const [replyTo,       setReplyTo]    = useState(null);   // { id, authorName } — ilaina ho an'ny parentId\n  const [sheetOpen,     setSheetOpen]  = useState(true);   // misokatra ho azy (fomba Facebook)",
  'state');

/* ── ② addComment : parentId ────────────────────────────────────────── */
s = rep(s,
  `  async function addComment() {
    const rt   = replyTo;
    const raw  = rt ? \`@\${rt} \${commentText}\` : commentText;
    const text = raw.trim(); const media = commentMedia;
    if (!text&&!media) return;
    let mediaURL='', mT='';
    if (media) { try { const r=await uploadToTelegram(media.file); mediaURL=r.url; mT=r.type; } catch {} }
    const cmt = { id:uuidv4(), uid:currentUser.uid, authorName:userProfile.fullName, authorPhoto: (userProfile.photoThumb || userProfile.photoURL)||'', authorIsVip:userProfile.isVip||false, text:text.slice(0,500), mediaURL, mediaType:mT, createdAt:new Date().toISOString() };`,
  `  async function addComment() {
    // ⚠️ Ny \`@Anarana\` teo aloha (ampiana amin'ny lahatsoratra) dia ESORINA :
    // ny FIL no maneho ny valiny izao, tsy ny lahatsoratra.
    const text = (commentText || '').trim(); const media = commentMedia;
    if (!text&&!media) return;
    let mediaURL='', mT='';
    if (media) { try { const r=await uploadToTelegram(media.file); mediaURL=r.url; mT=r.type; } catch {} }
    const cmt = { id:uuidv4(), uid:currentUser.uid, authorName:userProfile.fullName, authorPhoto: (userProfile.photoThumb || userProfile.photoURL)||'', authorIsVip:userProfile.isVip||false, text:text.slice(0,500), mediaURL, mediaType:mT, createdAt:new Date().toISOString(), ...(replyTo?.id ? { parentId: replyTo.id } : {}) };`,
  'addComment');

/* ── ③ Rendu : faritra commentaire → CommentSheet ───────────────────── */
{
  const START = '          <p style={{ fontWeight:700, fontSize:14, marginTop:10, marginBottom:12 }}>Commentaires ({post.comments?.length||0})</p>';
  const END   = `            <button onClick={addComment} style={{ background:'linear-gradient(135deg,#FF2D8D,#FF7AB8)', border:'none', borderRadius:'50%', width:36, height:36, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>➤</button>
          </div>`;

  const i = s.indexOf(START);
  if (i === -1) throw new Error('ASSERTION FAIL [rendu] : tsy hita ny fiandohana');
  const j = s.indexOf(END, i);
  if (j === -1) throw new Error('ASSERTION FAIL [rendu] : tsy hita ny fiafarana');

  const NEW = `          {/* Bokotra fanokafana — rehefa nakatona ny panneau */}
          <div onClick={() => setSheetOpen(true)}
            style={{ display:'flex', alignItems:'center', gap:8, marginTop:10, padding:'10px 12px',
                     background:'#F0F2F5', borderRadius:100, cursor:'pointer' }}>
            <img src={(userProfile?.photoThumb || userProfile?.photoURL) || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(userProfile?.fullName||'U')}&background=1877F2&color=fff\`}
              alt="" style={{ width:30, height:30, borderRadius:'50%', objectFit:'cover' }} />
            <span style={{ fontSize:13.5, color:'#65676B' }}>
              {post.comments?.length ? \`Voir les \${post.comments.length} commentaires\` : 'Écrire un commentaire…'}
            </span>
          </div>

          <input ref={cPhotoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{const f=e.target.files[0];if(f)setCmtMedia({file:f,type:'image',preview:URL.createObjectURL(f)});}}/>
          <input ref={cVideoRef} type="file" accept="video/*" style={{ display:'none' }} onChange={e=>{const f=e.target.files[0];if(f)setCmtMedia({file:f,type:'video',preview:URL.createObjectURL(f)});}}/>`;

  s = s.slice(0, i) + NEW + s.slice(j + END.length);
}

/* ── ④ Sheet : ampidirina alohan'ny MediaViewer ─────────────────────── */
s = rep(s,
  '      {viewerState && post && (\n        <MediaViewer',
  `      <CommentSheet
        open={sheetOpen && !!post}
        onClose={() => setSheetOpen(false)}
        post={post}
        comments={post?.comments || []}
        meUid={currentUser?.uid}
        userProfile={userProfile}
        value={commentText}
        onChange={setCmtText}
        onSend={addComment}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onReply={(root) => setReplyTo({ id: root.id, authorName: root.authorName })}
        onReact={(c, emoji) => reactToCmt(c.id, emoji)}
        onEdit={(c) => setEditCmt({ cmt: c, text: c.text })}
        onDelete={(c) => deleteCmt(c)}
        onPickMedia={() => cPhotoRef.current?.click()}
        mentions={mentions}
      />

      {viewerState && post && (
        <MediaViewer`,
  'sheet');

/* ── Fanamarinana farany ────────────────────────────────────────────── */
if (countOf(s, '<CommentSheet') !== 1) throw new Error('FAIL : CommentSheet tsy tokana');
if (s.includes('`@${rt} ${commentText}`')) throw new Error('FAIL : mbola misy ny @Anarana taloha');
for (const p of ['Home', 'Profile', 'Reels']) {
  const f = path.join(process.cwd(), 'src/pages/' + p + '.jsx');
  if (fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes('CommentSheet')) {
    throw new Error('FAIL : ' + p + ' voakasika — tsy tokony amin\'ity dingana ity');
  }
}

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY
  ? '✅ DRY-RUN : fanoloana 5 mety (tsy nisy nosoratana)'
  : '✅ Patch vita : PostDetail → CommentSheet');
