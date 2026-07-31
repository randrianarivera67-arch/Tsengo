/**
 * patch-mentions-3-fix.cjs   —  Fanitsiana : ny panneau mention tsy niseho
 * ─────────────────────────────────────────────────────────────────────────────
 * BUG EFATRA HITA TAMIN'NY FAMAKIANA NY CODE :
 *
 * ① `loadMentionFriends()` dia MIVERINA AVY HATRANY raha tsy manana namana :
 *      if (mentionFriends.length || !userProfile?.friends?.length) return;
 *    → Ny mpampiasa tsy manana "ami" dia TSY MAHAZO soso-kevitra MIHITSY.
 *    Ao amin'ny tambajotra tanora, vitsy ny mifanaiky ho namana ; ny
 *    abonnés/abonnements no be. Io no tena antony "tsy miasa mihitsy".
 *
 * ② Ny soso-kevitra dia avy amin'ny NAMANA ihany. Ny Facebook dia manolotra
 *    ny olona ifandraisanao rehetra.
 *    → Ampiana : followers + following (dédoublonné).
 *
 * ③ ⚠️ Ny listener `scroll` dia manakatona ny panneau :
 *      const close = () => { … setMentionQuery(null); };
 *      window.addEventListener('scroll', close, true);
 *    Amin'ny FINDAINA, rehefa miakatra ny fitendry dia MISCROLL ny pejy →
 *    mikatona ny panneau AVY HATRANY. Izay no mahatonga azy "tsy miseho".
 *    → Esorina ny `setMentionQuery(null)` amin'io handler io. Mikatona ihany
 *      izy rehefa tsy mifanaraka intsony ny lahatsoratra (espace, fafa).
 *
 * ④ Ny picker dia ao amin'ny COMMENTAIRE ihany — tsy ao amin'ny composer
 *    (famoahana publication). Manoratra `@` ao dia tsy misy na inona.
 *    → Ampiana ao amin'ny composer koa, miaraka amin'ny key '__composer__'.
 *
 * VOAKASIKA : src/pages/Home.jsx ihany.
 *
 * Fampandehanana :  node patch-mentions-3-fix.cjs --dry
 *                   node patch-mentions-3-fix.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/pages/Home.jsx');
const DRY = process.argv.includes('--dry');

if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/pages/Home.jsx'); process.exit(1); }

let s = fs.readFileSync(F, 'utf8');

if (s.includes('loadMentionPeople')) {
  console.log('⏭  Home.jsx : efa voapatch');
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

/* ── ① + ② Loharano midadasika kokoa ─────────────────────────────────────── */
s = rep(s,
  `  async function loadMentionFriends() {
    if (mentionFriends.length || !userProfile?.friends?.length) return;
    const list = await Promise.all(userProfile.friends.slice(0, 60).map(uid =>
      getDoc(doc(db, 'users', uid)).then(sn => sn.exists() ? { uid, fullName: sn.data().fullName || '', username: sn.data().username || '', photo: sn.data().photoThumb || sn.data().photoURL || '' } : null).catch(() => null)
    ));
    setMentionFriends(list.filter(Boolean));
  }`,
  `  // ⚠️ TALOHA : namana ihany, ary niverina avy hatrany raha tsy nisy namana
  // → ny mpampiasa tsy manana "ami" dia tsy nahazo soso-kevitra mihitsy.
  // IZAO : namana + abonnés + abonnements, dédoublonné.
  const mentionLoadingRef = useRef(false);
  async function loadMentionPeople() {
    if (mentionFriends.length || mentionLoadingRef.current) return;
    const uids = [...new Set([
      ...(userProfile?.friends   || []),
      ...(userProfile?.followers || []),
      ...(userProfile?.following || []),
    ])].filter(u => u && u !== currentUser?.uid).slice(0, 60);
    if (!uids.length) return;
    mentionLoadingRef.current = true;
    try {
      const list = await Promise.all(uids.map(uid =>
        getDoc(doc(db, 'users', uid))
          .then(sn => sn.exists()
            ? { uid, fullName: sn.data().fullName || '', username: sn.data().username || '',
                photo: sn.data().photoThumb || sn.data().photoURL || '' }
            : null)
          .catch(() => null)
      ));
      setMentionFriends(list.filter(Boolean).filter(f => f.fullName || f.username));
    } finally { mentionLoadingRef.current = false; }
  }`,
  'source');

s = rep(s, '                        if (mAt) { loadMentionFriends();',
          '                        if (mAt) { loadMentionPeople();', 'call');

/* ── ③ Ny scroll tsy manakatona intsony ny panneau ──────────────────────── */
s = rep(s,
  "    const close = () => { setPostMenu(null); setAudienceMenuOpen(false); setShowReact({}); setCmtReactionPicker(null); setMentionQuery(null); };",
  `    // ⚠️ \`setMentionQuery(null)\` NESORINA eto : amin'ny findaina, rehefa
    // miakatra ny fitendry dia miscroll ny pejy → nikatona avy hatrany ny
    // panneau mention. Mikatona ihany izy rehefa tsy mifanaraka ny lahatsoratra.
    const close = () => { setPostMenu(null); setAudienceMenuOpen(false); setShowReact({}); setCmtReactionPicker(null); };`,
  'scroll');

/* ── ④ Picker ao amin'ny composer ───────────────────────────────────────── */
s = rep(s,
  `              <textarea className="input" placeholder={t('whatsOnMind')} value={content} onChange={e => setContent(e.target.value)} rows={3} style={{ resize:'none', width:'100%', border:'none', fontSize:17 }} maxLength={MAX_POST} autoFocus/>`,
  `              <div style={{ position:'relative' }}>
                <textarea className="input" placeholder={t('whatsOnMind')} value={content}
                  onChange={e => {
                    const v = e.target.value;
                    setContent(v);
                    const mAt = v.match(/@([\\p{L}0-9_-]*)$/u);
                    if (mAt) { loadMentionPeople(); setMentionQuery({ postId: '__composer__', q: mAt[1].toLowerCase() }); }
                    else setMentionQuery(null);
                  }}
                  rows={3} style={{ resize:'none', width:'100%', border:'none', fontSize:17 }} maxLength={MAX_POST} autoFocus/>
                {mentionQuery?.postId === '__composer__' && (() => {
                  const q = mentionQuery.q;
                  const opts = mentionFriends.filter(f => f.fullName.toLowerCase().includes(q)
                    || (f.username || '').toLowerCase().includes(q)).slice(0, 6);
                  if (!opts.length) return null;
                  return (
                    <div onClick={e => e.stopPropagation()} style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #E4E6EB', borderRadius:12, boxShadow:'0 6px 20px rgba(0,0,0,.15)', zIndex:60, overflow:'hidden', maxHeight:260, overflowY:'auto' }}>
                      {opts.map(f => (
                        <button key={f.uid} onClick={() => {
                            const tag = f.username || f.fullName.split(' ')[0];
                            setContent(prev => prev.replace(/@([\\p{L}0-9_-]*)$/u, '@' + tag + ' '));
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
                      ))}
                    </div>
                  );
                })()}
              </div>`,
  'composer');

/* ── Fanamarinana farany ────────────────────────────────────────────────── */
if (countOf(s, 'loadMentionPeople') !== 3) {
  throw new Error('FAIL : nandrasana 3 loadMentionPeople (famaritana + antso 2), nahitana ' + countOf(s, 'loadMentionPeople'));
}
if (s.includes('loadMentionFriends')) {
  throw new Error('FAIL : mbola misy loadMentionFriends');
}
if (countOf(s, 'setMentionQuery(null)') < 3) {
  throw new Error('FAIL : very ny fanakatonana ny panneau');
}

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY
  ? '✅ DRY-RUN : fanoloana 4 mety (tsy nisy nosoratana)'
  : '✅ Patch vita : bug 4 voahitsy (loharano, scroll, composer)');
