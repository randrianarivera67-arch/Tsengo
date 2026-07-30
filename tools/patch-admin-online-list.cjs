/**
 * patch-admin-online-list.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 * BUT : ao amin'ny page Admin → Tableau de bord, ny carte "En ligne maintenant"
 *       dia lasa CLICABLE. Rehefa kitihina → misokatra modal misy ny LISITRA
 *       feno an'ireo mpampiasa actifs en temps réel.
 *
 * FIAROVANA :
 *   - assertion s.count(old) === 1 amin'ny fanoloana tsirairay
 *   - tsy misy requête Firestore vaovao (users + onlineMap efa ao an-tanana)
 *   - fonction MADIO (onlineUids / onlineUsers) → azo tsapaina amin'ny Node
 *   - idempotent : raha efa voapatch dia mijanona fa tsy manimba
 *
 * FICHIERS : src/utils/adminStats.js , src/pages/AdminDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const F_STATS = path.join(ROOT, 'src/utils/adminStats.js');
const F_DASH = path.join(ROOT, 'src/pages/AdminDashboard.jsx');

const DRY = process.argv.includes('--dry');

function read(f) {
  if (!fs.existsSync(f)) { throw new Error('FICHIER TSY HITA : ' + f); }
  return fs.readFileSync(f, 'utf8');
}
function countOf(s, sub) { return s.split(sub).length - 1; }

/** Fanoloana voaaro : tsy maintsy MIVERINA INDRAY MANDEHA ihany ny `old`. */
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error(
      'ASSERTION FAIL [' + label + '] : nandrasana 1 fiseho, nahitana ' + n + '\n' +
      '--- old ---\n' + old.slice(0, 220) + '\n-----------'
    );
  }
  return src.replace(old, neo);
}

const changed = [];

/* ═══════════════════════════════════════════════════════════════════════════
   1) src/utils/adminStats.js — fonction madio : lisitry ny en ligne
   ═══════════════════════════════════════════════════════════════════════════ */
{
  let s = read(F_STATS);

  if (s.includes('export function onlineUsers(')) {
    console.log('  ⏭  adminStats.js : efa voapatch (onlineUsers misy sahady)');
  } else {
    const ANCHOR = "/** Fiandohan'ny andro (locale) */";
    const ADD = `/** Lisitry ny uid tena EN LIGNE (=== true ihany, mitovy amin'ny countOnline) */
export function onlineUids(onlineMap) {
  if (!onlineMap || typeof onlineMap !== 'object') return [];
  const out = [];
  for (const k of Object.keys(onlineMap)) if (onlineMap[k] === true) out.push(k);
  return out;
}

/**
 * Lisitry ny mpampiasa en ligne, enrichi avy amin'ny tabilao \`users\` efa chargé.
 * ZAVA-DEHIBE : ny halavan'ny valiny dia MITOVY TANTERAKA amin'ny countOnline(),
 * na dia misy uid tsy hita ao amin'ny \`users\` aza (asehoina "Utilisateur inconnu").
 * Tsy misy requête vaovao mihitsy → tsy mikitika ny quota Firestore.
 */
export function onlineUsers(onlineMap, users) {
  const uids = onlineUids(onlineMap);
  if (uids.length === 0) return [];
  const byId = new Map();
  if (Array.isArray(users)) {
    for (const u of users) if (u && u.id) byId.set(u.id, u);
  }
  const out = uids.map((uid) => {
    const u = byId.get(uid);
    const name = (u && (u.fullName || u.username)) || '';
    return {
      uid,
      known: !!u,
      name: name || 'Utilisateur inconnu',
      username: (u && u.username) ? String(u.username) : '',
      photoURL: (u && u.photoURL) ? String(u.photoURL) : '',
      isVip: !!(u && u.isVip),
      isBanned: !!(u && u.isBanned),
    };
  });
  // Voafantatra aloha, avy eo araka ny anarana (alphabétique, tsy miova)
  out.sort((a, b) => (b.known === a.known ? a.name.localeCompare(b.name) : (b.known ? 1 : -1)));
  return out;
}

`;
    s = rep(s, ANCHOR, ADD + ANCHOR, 'stats:insert-onlineUsers');
    if (!DRY) fs.writeFileSync(F_STATS, s);
    changed.push('src/utils/adminStats.js');
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2) src/pages/AdminDashboard.jsx — carte clicable + modal
   ═══════════════════════════════════════════════════════════════════════════ */
{
  let s = read(F_DASH);

  if (s.includes('adm-online-modal')) {
    console.log('  ⏭  AdminDashboard.jsx : efa voapatch');
  } else {
    /* 2.a — import : ampiana onlineUsers ao anatin'ny bloc import efa misy */
    s = rep(
      s,
      "  countryStats, countryUnknown, buildActivity, agoShort, normCountryKey,\n} from '../utils/adminStats';",
      "  countryStats, countryUnknown, buildActivity, agoShort, normCountryKey,\n  onlineUsers,\n} from '../utils/adminStats';",
      'dash:import'
    );

    /* 2.b — state ho an'ny modal */
    s = rep(
      s,
      "  const [days, setDays] = useState(period);",
      "  const [days, setDays] = useState(period);\n  const [showOnline, setShowOnline] = useState(false);",
      'dash:state'
    );

    /* 2.c — lisitra ao anatin'ny useMemo efa misy (tsy misy calcul fanampiny) */
    s = rep(
      s,
      "      online: countOnline(onlineMap),",
      "      online: countOnline(onlineMap),\n      onlineList: onlineUsers(onlineMap, users),",
      'dash:memo'
    );

    /* 2.d — carte 'onl' lasa clicable */
    s = rep(
      s,
      "sub: 'Actifs en temps réel', live: true },",
      "sub: 'Actifs en temps réel', live: true, onClick: () => setShowOnline(true) },",
      'dash:card-onclick'
    );

    /* 2.e — rendu ny carte : cursor + onClick + chevron */
    s = rep(
      s,
      `          <div key={c.key} className="card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <ClayIcon name={c.icon} tone={c.tone} size={42} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="adm-muted" style={{ fontSize: 11.5, fontWeight: 600 }}>{c.label}</p>
              <p style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.4px' }}>{fmt(c.value)}</p>
              <p className="adm-muted" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {c.live && <LivePulse size={7} />}{c.sub}
              </p>
            </div>
          </div>`,
      `          <div key={c.key} className={'card' + (c.onClick ? ' adm-clickable' : '')}
            onClick={c.onClick}
            role={c.onClick ? 'button' : undefined}
            tabIndex={c.onClick ? 0 : undefined}
            onKeyDown={c.onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.onClick(); } } : undefined}
            style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start', cursor: c.onClick ? 'pointer' : 'default' }}>
            <ClayIcon name={c.icon} tone={c.tone} size={42} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="adm-muted" style={{ fontSize: 11.5, fontWeight: 600 }}>{c.label}</p>
              <p style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.4px' }}>{fmt(c.value)}</p>
              <p className="adm-muted" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {c.live && <LivePulse size={7} />}{c.sub}
              </p>
            </div>
            {c.onClick && (
              <span aria-hidden="true" style={{ alignSelf: 'center', color: '#98A2B3', transform: 'rotate(-90deg)', display: 'flex' }}>
                <NavIcon name="chevron" size={18} color="#98A2B3" />
              </span>
            )}
          </div>`,
      'dash:card-render'
    );

    /* 2.f — CSS : effet clicable + modal */
    s = rep(
      s,
      "        .dark .adm-dash{color:#E4E6EB}",
      `        .adm-clickable{transition:transform .12s ease,box-shadow .12s ease}
        .adm-clickable:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(16,24,40,.10)}
        .adm-clickable:active{transform:scale(.985)}
        .adm-ov{position:fixed;inset:0;background:rgba(16,24,40,.55);z-index:4000;display:flex;align-items:flex-end;justify-content:center;padding:0}
        @media(min-width:640px){.adm-ov{align-items:center;padding:20px}}
        .adm-sheet{background:#fff;width:100%;max-width:440px;max-height:82vh;display:flex;flex-direction:column;border-radius:18px 18px 0 0;overflow:hidden}
        @media(min-width:640px){.adm-sheet{border-radius:18px}}
        .adm-sheet-h{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #EAECF0;flex-shrink:0}
        .adm-sheet-b{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:6px 0}
        .adm-ol{display:flex;align-items:center;gap:11px;padding:9px 16px}
        .adm-ol:hover{background:#F9FAFB}
        .adm-x{margin-left:auto;border:none;background:#F2F4F7;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:16px;line-height:1;color:#475467;font-family:Poppins;flex-shrink:0}
        .dark .adm-sheet{background:#242526;color:#E4E6EB}
        .dark .adm-sheet-h{border-color:#3A3B3C}
        .dark .adm-ol:hover{background:#3A3B3C}
        .dark .adm-x{background:#3A3B3C;color:#E4E6EB}
        .dark .adm-dash{color:#E4E6EB}`,
      'dash:css'
    );

    /* 2.g — modal : ampidirina alohan'ny fikatonan'ny div lehibe */
    s = rep(
      s,
      `      </div>
    </div>
  );
}`,
      `      </div>

      {/* ── Modal : lisitry ny mpampiasa en ligne ── */}
      {showOnline && (
        <div className="adm-ov adm-online-modal" onClick={() => setShowOnline(false)}>
          <div className="adm-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="adm-sheet-h">
              <LivePulse size={8} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>En ligne maintenant</p>
                <p className="adm-muted" style={{ fontSize: 11.5 }}>{fmt(s.onlineList.length)} actif{s.onlineList.length > 1 ? 's' : ''} en temps réel</p>
              </div>
              <button className="adm-x" onClick={() => setShowOnline(false)} aria-label="Fermer">×</button>
            </div>
            <div className="adm-sheet-b">
              {s.onlineList.length === 0 && (
                <p className="adm-muted" style={{ padding: '22px 16px', textAlign: 'center' }}>Aucun utilisateur en ligne pour le moment.</p>
              )}
              {s.onlineList.map((u) => (
                <div key={u.uid} className="adm-ol">
                  <div style={{ position: 'relative', width: 38, height: 38, flexShrink: 0 }}>
                    <img
                      src={u.photoURL || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(u.name) + '&background=1877F2&color=fff')}
                      alt="" loading="lazy"
                      style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', display: 'block', background: '#F2F4F7' }}
                    />
                    <span style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff' }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.name}{u.isVip ? ' ⭐' : ''}{u.isBanned ? ' 🚫' : ''}
                    </p>
                    <p className="adm-muted" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.username ? '@' + u.username : u.uid}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`,
      'dash:modal'
    );

    if (!DRY) fs.writeFileSync(F_DASH, s);
    changed.push('src/pages/AdminDashboard.jsx');
  }
}

console.log(DRY ? '✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '✅ Patch vita');
changed.forEach((f) => console.log('   • ' + f));
if (!changed.length) console.log('   (tsy nisy fanovana — efa voapatch)');
