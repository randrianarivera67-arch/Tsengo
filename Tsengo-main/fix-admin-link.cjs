const fs = require('fs');
const p = 'src/components/Layout.jsx';
let s = fs.readFileSync(p, 'utf8');

const start = s.indexOf('{/* Panel Admin');
const parAnchor = '{/* Paramètres — atokana ambany indrindra';
if (start !== -1) {
  const parPos = s.indexOf(parAnchor, start);
  const lineStart = s.lastIndexOf('\n', parPos - 1) + 1;
  s = s.slice(0, start) + s.slice(lineStart);
  console.log('ancien bloc retire');
}

const re = /[ \t]*\{\/\* Paramètres — atokana ambany indrindra[^\n]*\n/;
const m = s.match(re);
if (!m) { console.log('ancre Parametres introuvable'); process.exit(1); }

const block =
"        {userProfile && userProfile.isAdmin ? (\n" +
"          <div style={{ padding: '0 14px 6px' }}>\n" +
"            <button onClick={() => { navigate('/admin'); setDrawerOpen(false); }}\n" +
"              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', textAlign: 'left', background: isDark ? '#15181F' : '#F7F8FA', border: '1.5px solid ' + (isActive('/admin') ? '#FF2D8D' : bdr), borderRadius: 14, cursor: 'pointer' }}>\n" +
"              <span className=\"icon-badge-3d\" style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(145deg,#FF2D8D,#FF7AB8)', flexShrink: 0 }}>\n" +
"                <HiShieldCheck size={20} color=\"white\" />\n" +
"              </span>\n" +
"              <span style={{ flex: 1, minWidth: 0 }}>\n" +
"                <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: text }}>Panel Admin</span>\n" +
"                <span style={{ display: 'block', fontSize: 11, color: '#65676B' }}>Utilisateurs, boost, diagnostic</span>\n" +
"              </span>\n" +
"              <HiChevronRight size={18} color=\"#65676B\" />\n" +
"            </button>\n" +
"          </div>\n" +
"        ) : null}\n\n";

s = s.replace(m[0], block + m[0]);
fs.writeFileSync(p, s);
console.log('OK bloc Panel Admin reinsere');
