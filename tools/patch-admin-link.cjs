const fs = require('fs');
const p = 'src/components/Layout.jsx';
let s = fs.readFileSync(p, 'utf8');
let OK = 0;

// 1) import de l'icône
if (!s.includes('HiShieldCheck')) {
  s = s.replace(
    "HiMicrophone, HiIdentification, HiDocumentText, HiChartBar, HiSwitchHorizontal, HiCheck, HiShoppingCart,",
    "HiMicrophone, HiIdentification, HiDocumentText, HiChartBar, HiSwitchHorizontal, HiCheck, HiShoppingCart, HiShieldCheck,"
  );
  console.log('✅ import HiShieldCheck'); OK++;
} else console.log('⏭️  import déjà fait');

// 2) entrée "Panel Admin" juste avant le bloc Paramètres (visible si isAdmin)
if (!s.includes('Panel Admin')) {
  const anchor = "        {/* Paramètres — atokana ambany indrindra (tsy atambatra amin'ny hafa) */}";
  if (!s.includes(anchor)) { console.log('❌ ancre Paramètres introuvable'); process.exit(1); }
  const block =
`        {/* Panel Admin — admin ihany */}
        {userProfile?.isAdmin && (
          <div style={{ padding: '0 14px 6px' }}>
            <button onClick={() => { navigate('/admin'); setDrawerOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', textAlign: 'left', background: isDark ? '#15181F' : '#F7F8FA', border: \`1.5px solid \${isActive('/admin') ? '#FF2D8D' : bdr}\`, borderRadius: 14, cursor: 'pointer' }}>
              <span className="icon-badge-3d" style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(145deg,#FF2D8D,#FF7AB8)', flexShrink: 0 }}>
                <HiShieldCheck size={20} color="white" />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: text }}>Panel Admin</span>
                <span style={{ display: 'block', fontSize: 11, color: '#65676B' }}>Utilisateurs, boost, diagnostic</span>
              </span>
              <HiChevronRight size={18} color="#65676B" />
            </button>
          </div>

`;
  s = s.replace(anchor, block + anchor);
  console.log('✅ entrée "Panel Admin" ajoutée (visible si isAdmin)'); OK++;
} else console.log('⏭️  entrée déjà présente');

fs.writeFileSync(p, s);
console.log('\n✅ ' + OK + ' modif(s) — build & push :');
console.log('   npx vite build  (facultatif, Vercel rebuild tout seul)');
console.log('   git add -A && git commit -m "Menu: Panel Admin (isAdmin)" && git push origin main');
