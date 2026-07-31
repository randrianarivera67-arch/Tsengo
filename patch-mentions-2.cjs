/**
 * patch-mentions-2.cjs   —  Picker fomba Facebook + @followers / @everyone
 * ─────────────────────────────────────────────────────────────────────────────
 * ASA :
 *   A) PICKER : sary + anarana feno + @username (fomba Facebook), fa tsy
 *      andalana lahatsoratra tsotra.
 *   B) `@followers`  → abonnés ny tompon'ny publication
 *      `@everyone`   → abonnés + namana rehetra   (aseho "Tout le monde")
 *      TOMPON'NY PUBLICATION IHANY no mahita azy ireo ao amin'ny picker,
 *      ary voamarina INDRAY ao amin'ny fandefasana (tsy ampy ny UI irery).
 *
 * NAHOANA `@everyone` FA TSY "@tout le monde" :
 *   Ny elanelana dia tsy azo parsé amin'ny fetra teny. Ny token dia tsy misy
 *   elanelana ; ny picker sy ny rendu no maneho "Tout le monde".
 *
 * FIAROVANA :
 *   • Fetra 200 mpandray isaky ny commentaire (batch Firestore 500).
 *   • Dédoublonnage : abonné izay namana koa dia iray ihany.
 *   • Ny tena sy ny tompon'ny publication esorina.
 *   • Fanamarinana tompo AO AMIN'NY FANDEFASANA : na dia misy manova ny UI
 *     aza, tsy mandeha ny diffusion raha tsy izy no tompony.
 *
 * ⚠️ FETRA FANTATRA : notification ANATY APP ihany no alefa amin'ny
 *   `@followers` / `@everyone` — TSY misy push. Ny push en masse dia mila
 *   route backend (toy ny /notify-all), izay asa manaraka. Ny mention
 *   tsirairay (@username) kosa dia mbola mandefa push toy ny teo aloha.
 *
 * VOAKASIKA : src/pages/Home.jsx ihany.
 *
 * Fampandehanana :  node patch-mentions-2.cjs --dry
 *                   node patch-mentions-2.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/pages/Home.jsx');
const L = path.join(process.cwd(), 'src/components/Linkify.jsx');
const DRY = process.argv.includes('--dry');

for (const [f, n] of [[F, 'src/pages/Home.jsx'], [L, 'src/components/Linkify.jsx']]) {
  if (!fs.existsSync(f)) { console.error('❌ Tsy hita : ' + n); process.exit(1); }
}

let s = fs.readFileSync(F, 'utf8');
let lk = fs.readFileSync(L, 'utf8');

if (s.includes('MENTION_SPECIALS') && lk.includes('SPECIAL_TAGS')) {
  console.log('⏭  efa voapatch');
  process.exit(0);
}

const countOf = (str, sub) => str.split(sub).length - 1;
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 240) + '\n-----------');
  }
  return src.replace(old, neo);
}

/* ── 1) Sary ho an'ny picker ─────────────────────────────────────────────── */
s = rep(s,
  "      getDoc(doc(db, 'users', uid)).then(sn => sn.exists() ? { uid, fullName: sn.data().fullName || '', username: sn.data().username || '' } : null).catch(() => null)",
  "      getDoc(doc(db, 'users', uid)).then(sn => sn.exists() ? { uid, fullName: sn.data().fullName || '', username: sn.data().username || '', photo: sn.data().photoThumb || sn.data().photoURL || '' } : null).catch(() => null)",
  'loadFriends:photo');

/* ── 2) Famaritana ny safidy manokana ───────────────────────────────────── */
s = rep(s,
  '  // ── Namana ho an\'ny mention @ ──',
  `  // ── Safidy manokana ao amin'ny picker mention ──────────────────────────
  // Token tsy misy elanelana (azo parsé), fa aseho amin'ny anarana mazava.
  // TOMPON'NY PUBLICATION IHANY — voamarina indray amin'ny fandefasana.
  const MENTION_SPECIALS = [
    { key: 'followers', tag: 'followers', label: 'Abonnés',       desc: 'Prévenir tous vos abonnés' },
    { key: 'everyone',  tag: 'everyone',  label: 'Tout le monde', desc: 'Abonnés + amis' },
  ];
  const MENTION_MAX = 200;   // fetra mpandray isaky ny commentaire

  // ── Namana ho an'ny mention @ ──`,
  'specials');

/* ── 3) Picker : sary + anarana + @username + safidy manokana ───────────── */
s = rep(s,
  `                    {mentionQuery?.postId === post.id && (() => {
                      const opts = mentionFriends.filter(f => f.fullName.toLowerCase().includes(mentionQuery.q)
                        || (f.username || '').toLowerCase().includes(mentionQuery.q)).slice(0,5);
                      if (!opts.length) return null;`,
  `                    {mentionQuery?.postId === post.id && (() => {
                      const q = mentionQuery.q;
                      const isOwner = post.uid === currentUser.uid;
                      const specials = isOwner
                        ? MENTION_SPECIALS.filter(sp => sp.tag.startsWith(q) || sp.label.toLowerCase().includes(q))
                        : [];
                      const opts = mentionFriends.filter(f => f.fullName.toLowerCase().includes(q)
                        || (f.username || '').toLowerCase().includes(q)).slice(0,5);
                      if (!opts.length && !specials.length) return null;`,
  'picker:opts');

s = rep(s,
  `                          {opts.map(f => (
                            <button key={f.uid} onClick={() => {
                                // @username (tokana) fa tsy anarana voalohany : mba tsy hifangaro
                                const tag = f.username || f.fullName.split(' ')[0];
                                setCmtText(prev => ({ ...prev, [post.id]: (prev[post.id]||'').replace(/@([\\p{L}0-9_-]*)$/u, '@'+tag+' ') }));
                                setMentionQuery(null);
                              }}
                              style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:13, color:'#050505', borderBottom:'1px solid #F0F2F5', textAlign:'left' }}>
                              <HiAtSymbol size={14} color="#1877F2"/>
                              <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {f.fullName}{f.username ? <span style={{ color:'#65676B' }}> @{f.username}</span> : null}
                              </span>
                            </button>
                          ))}`,
  `                          {specials.map(sp => (
                            <button key={sp.key} onClick={() => {
                                setCmtText(prev => ({ ...prev, [post.id]: (prev[post.id]||'').replace(/@([\\p{L}0-9_-]*)$/u, '@'+sp.tag+' ') }));
                                setMentionQuery(null);
                              }}
                              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', textAlign:'left', borderBottom:'1px solid #F0F2F5' }}>
                              <span style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, background:'linear-gradient(145deg,#7EB6FF,#2B6CF6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <HiAtSymbol size={17} color="white"/>
                              </span>
                              <span style={{ minWidth:0, flex:1 }}>
                                <span style={{ display:'block', fontSize:13, fontWeight:600, color:'#050505' }}>{sp.label}</span>
                                <span style={{ display:'block', fontSize:11, color:'#65676B' }}>{sp.desc}</span>
                              </span>
                            </button>
                          ))}
                          {opts.map(f => (
                            <button key={f.uid} onClick={() => {
                                // @username (tokana) fa tsy anarana voalohany : mba tsy hifangaro
                                const tag = f.username || f.fullName.split(' ')[0];
                                setCmtText(prev => ({ ...prev, [post.id]: (prev[post.id]||'').replace(/@([\\p{L}0-9_-]*)$/u, '@'+tag+' ') }));
                                setMentionQuery(null);
                              }}
                              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', textAlign:'left', borderBottom:'1px solid #F0F2F5' }}>
                              <img src={f.photo || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(f.fullName||'U')}&background=1877F2&color=fff\`}
                                alt="" style={{ width:34, height:34, borderRadius:'50%', objectFit:'cover', flexShrink:0, background:'#F0F2F5' }} />
                              <span style={{ minWidth:0, flex:1 }}>
                                <span style={{ display:'block', fontSize:13, fontWeight:600, color:'#050505', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.fullName}</span>
                                {f.username && <span style={{ display:'block', fontSize:11, color:'#65676B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>@{f.username}</span>}
                              </span>
                            </button>
                          ))}`,
  'picker:render');

/* ── 4) Fandefasana : @followers / @everyone ────────────────────────────── */
s = rep(s,
  `      mentioned.slice(0, 10).forEach(f => {`,
  `      // ── @followers / @everyone ────────────────────────────────────────
      // ⚠️ Voamarina INDRAY fa ny tompon'ny publication no mandefa : tsy ampy
      // ny fisafidianana ao amin'ny picker (azo ovaina ny lahatsoratra).
      if (post && post.uid === currentUser.uid) {
        const wantFollowers = mentionUsernames.has('followers');
        const wantEveryone  = mentionUsernames.has('everyone');
        if (wantFollowers || wantEveryone) {
          const set = new Set();
          for (const u of (userProfile.followers || [])) set.add(u);
          if (wantEveryone) for (const u of (userProfile.friends || [])) set.add(u);
          set.delete(currentUser.uid);
          const targets = [...set].slice(0, MENTION_MAX);
          const label = wantEveryone ? 'tout le monde' : 'ses abonnés';
          targets.forEach(uid => {
            addDoc(collection(db,'notifications'), {
              toUid: uid, fromUid: currentUser.uid,
              fromName: userProfile.fullName, fromPhoto: (userProfile.photoThumb || userProfile.photoURL) || '',
              type: 'mention', postId,
              message: \`\${userProfile.fullName} a mentionné \${label} dans un commentaire\`,
              read: false, createdAt: serverTimestamp(),
            }).catch(() => {});
          });
        }
      }

      mentioned.slice(0, 10).forEach(f => {`,
  'send:specials');

/* ── 5) Linkify : @followers / @everyone aseho ho badge, tsy lien ───────── */
{
  const OLD = `        if (p.type === 'mention') {`;
  if (countOf(lk, OLD) !== 1) {
    throw new Error('ASSERTION FAIL [linkify:special] : anchor tsy tokana — alefaso aloha ny patch-mentions.cjs');
  }
  lk = lk.replace(OLD, `        if (p.type === 'mention') {
          // Token manokana : tsy profil izy, ka aseho ho badge tsy clicable.
          // Raha tsy izao dia handeha ho /u/followers (tsy misy).
          const SPECIAL_TAGS = { followers: 'Abonnés', everyone: 'Tout le monde' };
          const sp = SPECIAL_TAGS[String(p.username).toLowerCase()];
          if (sp) {
            return (
              <span key={i} style={{ color: color || '#1877F2', fontWeight: 600 }}>@{sp}</span>
            );
          }`);
}

/* ── 6) Fanamarinana farany ─────────────────────────────────────────────── */
if (countOf(s, 'MENTION_SPECIALS') !== 2) {
  throw new Error('FAIL : nandrasana 2 MENTION_SPECIALS (famaritana + picker), nahitana ' + countOf(s, 'MENTION_SPECIALS'));
}
if (!s.includes("post.uid === currentUser.uid")) {
  throw new Error('FAIL : tsy hita ny fanamarinana tompo');
}

if (!lk.includes('SPECIAL_TAGS')) throw new Error('FAIL : Linkify tsy voapatch');

if (!DRY) { fs.writeFileSync(F, s); fs.writeFileSync(L, lk); }
console.log(DRY
  ? '✅ DRY-RUN : fanoloana 5 mety (tsy nisy nosoratana)'
  : '✅ Patch vita : Home.jsx + Linkify.jsx');
