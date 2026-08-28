/**
 * patch-story-facebook.cjs   —  Story : endrika Facebook
 * ─────────────────────────────────────────────────────────────────────────────
 * ① CHAMP « Répondre » : fond `rgba(255,255,255,.15)` → TRANSPARENT tanteraka
 *    (sisiny manify ihany), lehibe kokoa.
 * ② RÉACTION : ny boribory misy bordure dia esorina — emoji fotsiny, lehibe
 *    kokoa (22 → 34 px).
 * ③ ROA MIARAKA : ny champ sy ny emoji dia lasa BLOC IRAY azo akisaka
 *    (`overflow-x`) — miara-mikisaka, tsy mandalo ambany.
 *
 * ⚠️ TSY VOAKASIKA :
 *   • `reactToStory`, `sendStoryReply`, `flyingEmojis`
 *   • Ny bokotra « vue » an'ny TOMPONY (isMyStory) — mitazona ny endriny
 *   • Ny progression, ny zone tactile (35 % / 65 %), ny lisitra « Vu »
 *
 * VOAKASIKA : src/pages/Home.jsx
 *
 * Fampandehanana :  node patch-story-facebook.cjs --dry
 *                   node patch-story-facebook.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const F = path.join(process.cwd(), 'src/pages/Home.jsx');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/pages/Home.jsx'); process.exit(1); }

let s = fs.readFileSync(F, 'utf8');
const c = (x) => s.split(x).length - 1;
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };
if (s.includes('story-barre-v1')) { console.log('⏭  efa voapatch'); process.exit(0); }

/* ── ① Champ : transparent + lehibe ── */
const I_OLD = "style={{ flex:1, background:'rgba(255,255,255,.15)', border:'1.5px solid rgba(255,255,255,.35)', borderRadius:22, padding:'10px 16px', color:'white', fontSize:14, fontFamily:'Poppins', outline:'none' }} />";
if (c(I_OLD) !== 1) fail('champ Répondre tsy hita');
s = s.replace(I_OLD,
  "style={{ width:230, flexShrink:0, background:'transparent', border:'1.5px solid rgba(255,255,255,.6)', borderRadius:100, padding:'13px 18px', color:'white', fontSize:15, fontFamily:'Poppins', outline:'none' }} />");

/* ── ② Réaction : tsy misy boribory, emoji lehibe ── */
const R_OLD = "style={{ background: myStoryR.includes(em) ? 'rgba(255,255,255,.32)' : 'rgba(255,255,255,.12)', border: myStoryR.includes(em) ? '1.5px solid white' : '1px solid rgba(255,255,255,.25)', borderRadius:'50%', width:44, height:44, cursor:'pointer', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', transform: myStoryR.includes(em) ? 'scale(1.15)' : 'none', transition:'all .15s' }}>";
if (c(R_OLD) !== 1) fail('bokotra réaction tsy hita');
s = s.replace(R_OLD,
  "style={{ background:'transparent', border:'none', padding:0, cursor:'pointer', fontSize:34, lineHeight:1, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', transform: myStoryR.includes(em) ? 'scale(1.22)' : 'none', filter: myStoryR.includes(em) ? 'drop-shadow(0 0 8px rgba(255,255,255,.9))' : 'none', transition:'all .15s' }}>");

/* ── ③ Bloc réaction : mikisaka, tsy afovoany ── */
const B_OLD = "<div style={{ padding:'10px 14px 18px', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }} onClick={e => e.stopPropagation()}>";
if (c(B_OLD) !== 1) fail('bloc réaction tsy hita');
s = s.replace(B_OLD,
  "<div /* story-barre-v1 */ style={{ padding:'4px 14px 18px', display:'flex', flexWrap:'nowrap', alignItems:'center', gap:11, overflowX:'auto', overflowY:'hidden', scrollbarWidth:'none', WebkitOverflowScrolling:'touch', justifyContent: isMyStory ? 'center' : 'flex-start' }} onClick={e => e.stopPropagation()}>");

/* ── Fanamarinana ── */
if (!s.includes('story-barre-v1')) fail('marika very');
if (!s.includes("background:'transparent', border:'1.5px solid rgba(255,255,255,.6)'")) fail('champ tsy transparent');
if (!s.includes("fontSize:34, lineHeight:1")) fail('emoji tsy nalehibe');
if (s.includes("borderRadius:'50%', width:44, height:44")) fail('boribory réaction mbola ao');
if (!s.includes("overflowX:'auto'")) fail('scroll very');
// Fizotra tsy voakasika
if (!s.includes('reactToStory(cur, em, e)')) fail('reactToStory simba');
if (!s.includes('sendStoryReply(cur)')) fail('sendStoryReply simba');
if (!s.includes('openStoryReactors(cur)')) fail('bokotra vue simba');
if (!s.includes('startStoryPress()')) fail('zone tactile simba');
if (!s.includes('flyingEmojis.map')) fail('animation emoji simba');
if (!s.includes('storyReactors !== null')) fail('lisitra Vu simba');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY ? '✅ DRY-RUN (tsy nisy nosoratana)' : '✅ Patch vita : barre story fomba Facebook');
