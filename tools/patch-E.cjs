#!/usr/bin/env node
// patch-E.cjs — Fix picker overflow + textBg form

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
let ok = 0, warn = 0, fail = 0;
const good = m => { console.log('  ✅ ' + m); ok++; };
const skip = m => { console.log('  ⚠️  ' + m); warn++; };
const err  = m => { console.log('  ❌ ' + m); fail++; };
const read = rel => {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { err('Introuvable: ' + rel); return null; }
  return fs.readFileSync(p, 'utf8');
};
const write = (rel, s) => fs.writeFileSync(path.join(ROOT, rel), s, 'utf8');
const rep = (rel, from, to, label) => {
  const s = read(rel); if (!s) return;
  if (!s.includes(from)) { skip('Ancre manquante: ' + label); return; }
  write(rel, s.replace(from, to)); good(label);
};

console.log('\n═══════════════════════════════════════════════');
console.log('  PATCH E — Picker visible + TextBg form fix');
console.log('═══════════════════════════════════════════════\n');

// ═══════════════════════════════════════
// [1] FIX PICKER — position left:0 (tsy centered)
// mba tsy miafina amin'ny havia
// ═══════════════════════════════════════
console.log('[1] Home.jsx — Fix picker position (tsy overflow)...');

// Fix Home.jsx picker position
let home = read('src/pages/Home.jsx');
if (home) {
  // Replace all picker position styles
  const oldPicker = `bottom:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)'`;
  const newPicker = `bottom:'calc(100% + 8px)', left:0`;
  const count = (home.match(new RegExp(oldPicker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
  if (count > 0) {
    home = home.replaceAll(oldPicker, newPicker);
    write('src/pages/Home.jsx', home);
    good('Picker position fixed (' + count + ' occurrence)');
  } else {
    skip('Picker position — ancre différente');
  }
}

// Fix Profile.jsx picker position
let prof = read('src/pages/Profile.jsx');
if (prof) {
  const oldPicker = `bottom:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)'`;
  const newPicker = `bottom:'calc(100% + 8px)', left:0`;
  if (prof.includes(oldPicker)) {
    prof = prof.replaceAll(oldPicker, newPicker);
    write('src/pages/Profile.jsx', prof);
    good('Profile picker position fixed');
  } else {
    skip('Profile picker position — ancre différente');
  }
}

// ═══════════════════════════════════════
// [2] FIX — Ajouter ❤️ J'aime si absent du picker
// ═══════════════════════════════════════
console.log('\n[2] Vérifier FB_REACTIONS contient ❤️...');
home = read('src/pages/Home.jsx');
if (home) {
  if (!home.includes("emoji:'❤️'")) {
    rep('src/pages/Home.jsx',
      "const FB_REACTIONS = [",
      `const FB_REACTIONS = [
  { emoji:'❤️', label:"J'aime"    },`,
      '❤️ ajouté au début de FB_REACTIONS'
    );
  } else {
    good('❤️ déjà présent dans FB_REACTIONS ✓');
  }
}

// ═══════════════════════════════════════
// [3] FIX TextBg FORM — forcer le textarea coloré
// ═══════════════════════════════════════
console.log('\n[3] Home.jsx — TextBg form (fond coloré pendant création)...');

home = read('src/pages/Home.jsx');
if (!home) process.exit(1);

// Vérifier si textBg state existe
if (!home.includes('const [textBg,')) {
  // Ajouter le state
  home = home.replace(
    'const [expandedPosts, setExpandedPosts] = useState({});',
    'const [expandedPosts, setExpandedPosts] = useState({});\n  const [textBg,       setTextBg]       = useState(null);'
  );
  write('src/pages/Home.jsx', home);
  good('textBg state ajouté');
} else {
  good('textBg state déjà présent ✓');
}

// Vérifier TEXT_BG_COLORS
home = read('src/pages/Home.jsx');
if (!home.includes('TEXT_BG_COLORS')) {
  home = home.replace(
    "const REACTIONS   = ['❤️','😂','😮','😢','😡'];",
    `const REACTIONS   = ['❤️','😂','😮','😢','😡'];
const TEXT_BG_COLORS = [
  null,
  'linear-gradient(135deg,#1877F2,#42A5F5)',
  'linear-gradient(135deg,#E91E8C,#FF6BB5)',
  'linear-gradient(135deg,#FF7A00,#FFB347)',
  'linear-gradient(135deg,#00C853,#69F0AE)',
  'linear-gradient(135deg,#7C3AED,#A78BFA)',
  'linear-gradient(135deg,#D32F2F,#FF8A80)',
  'linear-gradient(135deg,#1A1A1A,#424242)',
];`
  );
  write('src/pages/Home.jsx', home);
  good('TEXT_BG_COLORS ajouté');
} else {
  good('TEXT_BG_COLORS déjà présent ✓');
}

// Maintenant trouver le textarea principal et le remplacer
home = read('src/pages/Home.jsx');

// Chercher la textarea principale dans le formulaire de publication
const oldTA = `<textarea className="input" placeholder={t('whatsOnMind')} value={content} onChange={e => setContent(e.target.value)} rows={3} style={{ resize:'none', width:'100%', border:'none', fontSize:17 }} maxLength={MAX_POST} autoFocus/>`;
const newTA = `{textBg ? (
              <div style={{ background:textBg, borderRadius:14, minHeight:180, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 16px', width:'100%' }} onClick={()=>document.getElementById('textbg-input')?.focus()}>
                <textarea
                  id="textbg-input"
                  placeholder="Écrire quelque chose..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  style={{ resize:'none', width:'100%', border:'none', fontSize:22, fontWeight:800, color:'white', textAlign:'center', background:'transparent', outline:'none', lineHeight:1.4, minHeight:80 }}
                  maxLength={MAX_POST}
                  autoFocus
                />
              </div>
            ) : (
              <textarea className="input" placeholder={t('whatsOnMind')} value={content} onChange={e => setContent(e.target.value)} rows={3} style={{ resize:'none', width:'100%', border:'none', fontSize:17 }} maxLength={MAX_POST} autoFocus/>
            )}`;

if (home.includes(oldTA) && !home.includes('textbg-input')) {
  home = home.replace(oldTA, newTA);
  write('src/pages/Home.jsx', home);
  good('TextBg textarea form ajouté');
} else if (home.includes('textbg-input')) {
  good('TextBg form déjà présent ✓');
} else {
  // Chercher une variante
  skip('Ancre textarea principale manquante — recherche variante...');
  // Try to find the textarea in the publication form
  const idx = home.indexOf("placeholder={t('whatsOnMind')}");
  if (idx > -1) {
    const lineStart = home.lastIndexOf('\n', idx);
    const lineEnd = home.indexOf('\n', idx + 100);
    const line = home.slice(lineStart, lineEnd + 1);
    console.log('  Ligne trouvée:', line.trim().slice(0, 80));
    err('Variante non reconnue — vérification manuelle nécessaire');
  }
}

// ═══════════════════════════════════════
// [4] FIX — Color picker dans le formulaire
// ═══════════════════════════════════════
console.log('\n[4] Home.jsx — Color picker dans formulaire...');
home = read('src/pages/Home.jsx');
if (!home.includes('TEXT_BG_COLORS.map') || !home.includes('setTextBg')) {
  // Chercher après le textarea/content length counter
  const anchor = '{content.length > 0 && <p style={{ fontSize:11, color:charColor, textAlign:\'right\', marginTop:2 }}>{rem} restants</p>}';
  if (home.includes(anchor) && !home.includes('Fond :') && !home.includes('TEXT_BG_COLORS.map')) {
    home = home.replace(anchor,
      `{content.length > 0 && <p style={{ fontSize:11, color:charColor, textAlign:'right', marginTop:2 }}>{rem} restants</p>}
          <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'center', justifyContent:'center', flexWrap:'wrap' }}>
            {TEXT_BG_COLORS.map((bg, i) => (
              <button key={i} onClick={() => setTextBg(bg === textBg ? null : bg)}
                style={{ width: textBg===bg ? 32 : 26, height: textBg===bg ? 32 : 26, borderRadius:'50%', padding:0, cursor:'pointer', flexShrink:0,
                  background: bg || '#ffffff',
                  border: textBg===bg ? '3px solid #050505' : '2px solid #E4E6EB',
                  transition:'all .15s',
                  boxShadow: textBg===bg ? '0 0 0 2px white, 0 0 0 4px #050505' : 'none' }}/>
            ))}
          </div>`
    );
    write('src/pages/Home.jsx', home);
    good('Color picker ajouté dans formulaire');
  } else if (home.includes('TEXT_BG_COLORS.map')) {
    good('Color picker déjà présent ✓');
  } else {
    skip('Ancre color picker manquante');
  }
} else {
  good('Color picker déjà présent ✓');
}

// ═══════════════════════════════════════
// [5] FIX — Reset textBg après publication
// ═══════════════════════════════════════
console.log('\n[5] Home.jsx — Reset textBg après pub...');
home = read('src/pages/Home.jsx');
if (home.includes('const [textBg,') && !home.includes("setTextBg(null)")) {
  // Find reset line
  const resetLine = "setContent(''); setLocation(null);";
  if (home.includes(resetLine)) {
    home = home.replaceAll(resetLine, "setContent(''); setLocation(null); setTextBg(null);");
    write('src/pages/Home.jsx', home);
    good('Reset textBg ajouté');
  } else {
    skip('Ligne de reset non trouvée');
  }
} else {
  good('Reset textBg déjà présent ✓');
}

// ═══════════════════════════════════════
// [6] CSS placeholder blanc
// ═══════════════════════════════════════
console.log('\n[6] index.css — placeholder blanc...');
let css = read('src/index.css');
if (css && !css.includes('.textbg-textarea::placeholder')) {
  css = css.replace(
    'input::placeholder, textarea::placeholder { color: #8A8D91 !important; font-size: 13px; }',
    'input::placeholder, textarea::placeholder { color: #8A8D91 !important; font-size: 13px; }\n#textbg-input::placeholder { color: rgba(255,255,255,0.65) !important; font-size: 22px; }'
  );
  write('src/index.css', css);
  good('Placeholder blanc ajouté');
} else {
  good('Placeholder blanc déjà présent ✓');
}

console.log('\n═══════════════════════════════════════════════');
console.log('  Résultat: ' + ok + ' ✅  ' + warn + ' ⚠️   ' + fail + ' ❌');
console.log('═══════════════════════════════════════════════');
if (fail === 0) console.log('\n🎉 Patch E terminé! npm run build\n');
else console.log('\n⚠️  Erreur(s). Envoie ce log.\n');
