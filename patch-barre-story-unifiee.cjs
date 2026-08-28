#!/usr/bin/env node
/**
 * patch-barre-story-unifiee.cjs
 * ÉTAPE ① du plan story : champ "Répondre" + emojis de réaction
 * regroupés dans UN SEUL bloc JSX (déplacement de REACTIONS.map
 * à l'intérieur du bloc champ). Aucune modification CSS globale,
 * aucune modification de la musique ni du plein écran.
 *
 * Usage :
 *   node patch-barre-story-unifiee.cjs            → DRY-RUN (n'écrit rien)
 *   node patch-barre-story-unifiee.cjs --apply    → applique + sauvegarde .bak
 */
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const FILE = path.join(__dirname, 'src', 'pages', 'Home.jsx');
const MARQUEUR = 'STORY-BARRE-UNIFIEE';

const ok = m => console.log('  ✓ ' + m);
const die = m => { console.error('  ✘ ÉCHEC : ' + m); process.exit(1); };

console.log(`\n=== patch-barre-story-unifiee (${APPLY ? 'APPLY' : 'DRY-RUN'}) ===\n`);

// ── Assertion 0 : fichier présent ────────────────────────────────
if (!fs.existsSync(FILE)) die('src/pages/Home.jsx introuvable');
const src = fs.readFileSync(FILE, 'utf8');
ok(`Home.jsx lu (${src.split('\n').length} lignes)`);

// ── Assertion 1 : idempotence ────────────────────────────────────
if (src.includes(MARQUEUR)) {
  console.log('  ↷ Patch déjà appliqué (marqueur présent). Rien à faire.');
  process.exit(0);
}
ok('Marqueur absent → patch pas encore appliqué');

// ── Assertion 2 : ancre unique ───────────────────────────────────
const ANCRE = `            {/* ── Répondre (envoie un message direct au propriétaire) ── */}
            {!isMyStory && (
              <div style={{ padding:'0 14px 8px', display:'flex', alignItems:'center', gap:8 }} onClick={e => e.stopPropagation()}>
                <input value={storyReply} onChange={e => setStoryReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendStoryReply(cur); }}
                  placeholder="Répondre..." maxLength={500}
                  style={{ flex:1, background:'rgba(255,255,255,.15)', border:'1.5px solid rgba(255,255,255,.35)', borderRadius:22, padding:'10px 16px', color:'white', fontSize:14, fontFamily:'Poppins', outline:'none' }} />
                {storyReply.trim() && (
                  <button onClick={() => sendStoryReply(cur)} disabled={sendingStoryReply}
                    style={{ background:'#1877F2', border:'none', borderRadius:'50%', width:40, height:40, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <HiPaperAirplane size={18} />
                  </button>
                )}
              </div>
            )}

            {/* ── Réactions (format Facebook, plusieurs possibles) ── */}
            <div style={{ padding:'10px 14px 18px', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }} onClick={e => e.stopPropagation()}>
              {isMyStory ? (
                <button onClick={() => openStoryReactors(cur)}
                  style={{ background:'rgba(255,255,255,.14)', border:'1px solid rgba(255,255,255,.3)', borderRadius:22, padding:'9px 18px', cursor:'pointer', color:'white', fontFamily:'Poppins', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
                  👁 {vCount} vue{vCount>1?'s':''}{rCount > 0 ? \` · \${[...new Set(allEmojis)].slice(0,3).join('')} \${rCount}\` : ''} — voir
                </button>
              ) : (
                REACTIONS.map(em => (
                  <button key={em} onClick={e => reactToStory(cur, em, e)}
                    style={{ background: myStoryR.includes(em) ? 'rgba(255,255,255,.32)' : 'rgba(255,255,255,.12)', border: myStoryR.includes(em) ? '1.5px solid white' : '1px solid rgba(255,255,255,.25)', borderRadius:'50%', width:44, height:44, cursor:'pointer', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', transform: myStoryR.includes(em) ? 'scale(1.15)' : 'none', transition:'all .15s' }}>
                    {em}
                  </button>
                ))
              )}
            </div>`;

const nAncre = src.split(ANCRE).length - 1;
if (nAncre !== 1) die(`ancre trouvée ${nAncre} fois (attendu : 1)`);
ok('Ancre trouvée exactement 1 fois');

// ── Remplacement ─────────────────────────────────────────────────
const REMPLACEMENT = `            {/* ── ${MARQUEUR} : champ "Répondre" + emojis dans UN SEUL bloc ── */}
            {!isMyStory ? (
              <div style={{ padding:'0 14px 18px', display:'flex', flexDirection:'column', gap:10 }} onClick={e => e.stopPropagation()}>
                {/* Champ : message direct au propriétaire */}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input value={storyReply} onChange={e => setStoryReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') sendStoryReply(cur); }}
                    placeholder="Répondre..." maxLength={500}
                    style={{ flex:1, background:'rgba(255,255,255,.15)', border:'1.5px solid rgba(255,255,255,.35)', borderRadius:22, padding:'10px 16px', color:'white', fontSize:14, fontFamily:'Poppins', outline:'none' }} />
                  {storyReply.trim() && (
                    <button onClick={() => sendStoryReply(cur)} disabled={sendingStoryReply}
                      style={{ background:'#1877F2', border:'none', borderRadius:'50%', width:40, height:40, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <HiPaperAirplane size={18} />
                    </button>
                  )}
                </div>
                {/* Réactions (format Facebook, plusieurs possibles) */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                  {REACTIONS.map(em => (
                    <button key={em} onClick={e => reactToStory(cur, em, e)}
                      style={{ background: myStoryR.includes(em) ? 'rgba(255,255,255,.32)' : 'rgba(255,255,255,.12)', border: myStoryR.includes(em) ? '1.5px solid white' : '1px solid rgba(255,255,255,.25)', borderRadius:'50%', width:44, height:44, cursor:'pointer', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', transform: myStoryR.includes(em) ? 'scale(1.15)' : 'none', transition:'all .15s' }}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding:'10px 14px 18px', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => openStoryReactors(cur)}
                  style={{ background:'rgba(255,255,255,.14)', border:'1px solid rgba(255,255,255,.3)', borderRadius:22, padding:'9px 18px', cursor:'pointer', color:'white', fontFamily:'Poppins', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
                  👁 {vCount} vue{vCount>1?'s':''}{rCount > 0 ? \` · \${[...new Set(allEmojis)].slice(0,3).join('')} \${rCount}\` : ''} — voir
                </button>
              </div>
            )}`;

const out = src.replace(ANCRE, REMPLACEMENT);

// ── Assertions post-transformation (en mémoire) ──────────────────
const compte = (s, t) => s.split(t).length - 1;
const verifs = [
  ['marqueur inséré 1 fois',            compte(out, MARQUEUR) === 1],
  ['REACTIONS.map conservé (1 fois)',   compte(out, 'REACTIONS.map') === compte(src, 'REACTIONS.map')],
  ['champ storyReply conservé',         compte(out, 'value={storyReply}') === 1],
  ['bouton envoi conservé',             compte(out, 'sendStoryReply(cur)') === compte(src, 'sendStoryReply(cur)')],
  ['bouton "vues" conservé',            compte(out, 'openStoryReactors(cur)') === 1],
  ['reactToStory conservé',             compte(out, 'reactToStory(cur, em, e)') === 1],
  ['ancienne barre séparée supprimée',  !out.includes("padding:'0 14px 8px', display:'flex', alignItems:'center', gap:8 }} onClick")],
  ['musique intacte',                   compte(out, 'StoryMusicPlayer') === compte(src, 'StoryMusicPlayer')],
  ['plein écran intact',                compte(out, "maxWidth:'100%', maxHeight:'100%'") === compte(src, "maxWidth:'100%', maxHeight:'100%'")],
  ['accolades équilibrées',             (compte(REMPLACEMENT,'{') - compte(REMPLACEMENT,'}')) === (compte(ANCRE,'{') - compte(ANCRE,'}'))],
  ['balises div équilibrées',           (compte(REMPLACEMENT,'<div') - compte(REMPLACEMENT,'</div>')) === (compte(ANCRE,'<div') - compte(ANCRE,'</div>'))],
  ['delta de taille raisonnable',       Math.abs(out.length - src.length) < 1500],
];
let ko = 0;
for (const [nom, cond] of verifs) { if (cond) ok(nom); else { console.error('  ✘ ' + nom); ko++; } }
if (ko) die(`${ko} assertion(s) échouée(s) — aucune écriture`);

// ── Écriture ─────────────────────────────────────────────────────
if (!APPLY) {
  console.log(`\n  DRY-RUN OK. Delta : ${out.length - src.length} caractères.`);
  console.log('  Relancer avec --apply pour écrire.\n');
  process.exit(0);
}
fs.writeFileSync(FILE + '.bak', src, 'utf8');
fs.writeFileSync(FILE, out, 'utf8');
console.log(`\n  ✅ Appliqué. Sauvegarde : src/pages/Home.jsx.bak\n`);
