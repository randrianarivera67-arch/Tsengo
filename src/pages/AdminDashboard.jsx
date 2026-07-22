// src/pages/AdminDashboard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Tableau de bord Admin — endrika matihanina araka ny maquette.
// NOMBRE EXACT hatrany (tsy misy pourcentage). Calcul avy amin'ny utils/adminStats
// (voatsapa 88 teste) sy utils/chartMath (58 teste).
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { ClayIcon, NavIcon, LivePulse } from '../components/AdminIcons';
import { SignupsChart, GenderDonut, WorldMapChart } from '../components/AdminCharts';
import { COUNTRY_ALIAS } from '../components/worldMapData';
import {
  fmt, countOnline, newSignups, signupsPerDay, genderStats,
  countryStats, countryUnknown, buildActivity, agoShort, normCountryKey,
} from '../utils/adminStats';

const GENDER_COLORS = { male: '#2B6CF6', female: '#FF2D8D', other: '#F2B300', unknown: '#CBD5E1' };

export default function AdminDashboard({
  users = [], posts = [], shops = [], artists = [], onlineMap = {},
  adminName = 'Admin', period = 7, onPeriodChange,
}) {
  const [days, setDays] = useState(period);
  const setP = (d) => { setDays(d); onPeriodChange && onPeriodChange(d); };

  const s = useMemo(() => {
    const now = Date.now();
    const g = genderStats(users);
    const cs = countryStats(users);
    // Isa isaky ny code ISO2 ho an'ny carte (ny anarana voatahiry → code, na frantsay na anglisy)
    const byCode = {};
    for (const c of cs) {
      const code = c.code || COUNTRY_ALIAS[normCountryKey(c.name)] || '';
      if (code) byCode[code] = (byCode[code] || 0) + c.count;
    }
    return {
      total: users.length,
      online: countOnline(onlineMap),
      signups: newSignups(users, days, now),
      signupsPrev: newSignups(users, days * 2, now) - newSignups(users, days, now),
      curve: signupsPerDay(users, days, now),
      gender: g,
      countries: cs,
      unknownCountry: countryUnknown(users),
      byCode,
      activity: buildActivity({ users, posts, shops, artists }, 6),
      now,
    };
  }, [users, posts, shops, artists, onlineMap, days]);

  const cards = [
    { key: 'tot',  label: 'Utilisateurs totaux', value: s.total,   tone: 'blue',   icon: 'users',  sub: fmt(s.signups) + ' sur ' + days + ' jours' },
    { key: 'onl',  label: 'En ligne maintenant', value: s.online,  tone: 'green',  icon: 'live',   sub: 'Actifs en temps réel', live: true },
    { key: 'ins',  label: 'Nouvelles inscriptions', value: s.signups, tone: 'pink', icon: 'signup', sub: fmt(s.signupsPrev) + ' période précédente' },
    { key: 'shop', label: 'Boutiques actives',  value: shops.length,  tone: 'amber', icon: 'shop',   sub: fmt(posts.length) + ' publications' },
    { key: 'art',  label: 'Artistes',           value: artists.length, tone: 'purple', icon: 'artist', sub: fmt(s.gender.total) + ' profils au total' },
  ];

  const genderEntries = [
    { key: 'male',    label: 'Hommes',        value: s.gender.male,    color: GENDER_COLORS.male },
    { key: 'female',  label: 'Femmes',        value: s.gender.female,  color: GENDER_COLORS.female },
    { key: 'other',   label: 'Autres',        value: s.gender.other,   color: GENDER_COLORS.other },
    { key: 'unknown', label: 'Non renseigné', value: s.gender.unknown, color: GENDER_COLORS.unknown },
  ];

  const maxCountry = s.countries.length ? s.countries[0].count : 1;
  const ACT = {
    user:   { icon: 'users',   tone: 'blue',   text: "s'est inscrit sur Trengo" },
    post:   { icon: 'image',   tone: 'green',  text: 'a publié une nouvelle publication' },
    shop:   { icon: 'shop',    tone: 'amber',  text: 'a créé une nouvelle boutique' },
    artist: { icon: 'artist',  tone: 'purple', text: 'a rejoint les artistes' },
  };

  return (
    <div className="adm-dash">
      <style>{`
        .adm-dash{font-family:Poppins,sans-serif;color:#101828}
        .adm-dash .card{background:#fff;border:1px solid #EAECF0;border-radius:16px;box-shadow:0 1px 3px rgba(16,24,40,.05)}
        .adm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(178px,1fr));gap:12px;margin-bottom:16px}
        .adm-row{display:grid;gap:14px;margin-bottom:14px}
        .adm-row-3{grid-template-columns:1fr}
        .adm-row-2{grid-template-columns:1fr}
        @media(min-width:900px){.adm-row-3{grid-template-columns:1.55fr 1fr 1fr}.adm-row-2{grid-template-columns:1.75fr 1fr}}
        @media(min-width:640px) and (max-width:899px){.adm-row-3{grid-template-columns:1fr 1fr}}
        .adm-h{font-size:15.5px;font-weight:700;color:#101828}
        .adm-muted{font-size:11.5px;color:#98A2B3}
        .adm-per{display:flex;gap:6px;background:#F2F4F7;border-radius:11px;padding:4px}
        .adm-per button{border:none;background:none;font-family:Poppins;font-size:12px;font-weight:600;color:#667085;padding:6px 11px;border-radius:8px;cursor:pointer}
        .adm-per button.on{background:#fff;color:#101828;box-shadow:0 1px 2px rgba(16,24,40,.08)}
        .adm-ctr{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F2F4F7}
        .adm-ctr:last-child{border-bottom:none}
        .adm-bar{height:7px;border-radius:4px;background:#F2F4F7;overflow:hidden;flex:1;min-width:44px}
        .adm-bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#C026D3,#FF2D8D)}
        @keyframes adminPulse{0%{transform:scale(1);opacity:.5}70%{transform:scale(2.4);opacity:0}100%{opacity:0}}
        .dark .adm-dash{color:#E4E6EB}
        .dark .adm-dash .card{background:#242526;border-color:#3A3B3C}
        .dark .adm-dash .adm-h{color:#E4E6EB}
      `}</style>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>Bienvenue, {adminName} !</h1>
          <p className="adm-muted" style={{ fontSize: 12.5, marginTop: 3 }}>Voici un aperçu complet de votre plateforme Trengo.</p>
        </div>
        <div className="adm-per">
          {[7, 14, 30].map(d => (
            <button key={d} className={days === d ? 'on' : ''} onClick={() => setP(d)}>{d} jours</button>
          ))}
        </div>
      </div>

      {/* ── Cartes stats (nombre EXACT) ── */}
      <div className="adm-stats">
        {cards.map(c => (
          <div key={c.key} className="card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <ClayIcon name={c.icon} tone={c.tone} size={42} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="adm-muted" style={{ fontSize: 11.5, fontWeight: 600 }}>{c.label}</p>
              <p style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.4px' }}>{fmt(c.value)}</p>
              <p className="adm-muted" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {c.live && <LivePulse size={7} />}{c.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Courbe + Genre + Activité ── */}
      <div className="adm-row adm-row-3">
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="adm-h">Inscriptions par jour</span>
            <span className="adm-muted">{fmt(s.signups)} au total</span>
          </div>
          <SignupsChart data={s.curve} />
        </div>

        <div className="card" style={{ padding: 16 }}>
          <p className="adm-h" style={{ marginBottom: 10 }}>Répartition par genre</p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <GenderDonut entries={genderEntries} total={s.gender.total} />
          </div>
          {genderEntries.map(g => (
            <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <i style={{ width: 9, height: 9, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: '#475467', flex: 1 }}>{g.label}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{fmt(g.value)}</span>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <p className="adm-h" style={{ marginBottom: 10 }}>Activité en temps réel</p>
          {s.activity.length === 0 && <p className="adm-muted">Aucune activité récente.</p>}
          {s.activity.map((a, i) => {
            const meta = ACT[a.type] || ACT.user;
            return (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0' }}>
                <ClayIcon name={meta.icon} tone={meta.tone} size={32} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</p>
                  <p className="adm-muted" style={{ fontSize: 11.5 }}>{meta.text}</p>
                  <p className="adm-muted" style={{ fontSize: 10.5 }}>{agoShort(a.ms, s.now)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Utilisateurs par pays + Statut ── */}
      <div className="adm-row adm-row-2">
        <div className="card" style={{ padding: 16 }}>
          <p className="adm-h" style={{ marginBottom: 10 }}>Utilisateurs par pays</p>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr' }}>
            <WorldMapChart counts={s.byCode} />
            <div>
              <div className="adm-ctr" style={{ borderBottom: '1px solid #EAECF0' }}>
                <span className="adm-muted" style={{ flex: 1, fontWeight: 700 }}>Pays</span>
                <span className="adm-muted" style={{ fontWeight: 700 }}>Utilisateurs</span>
              </div>
              {s.countries.length === 0 && (
                <p className="adm-muted" style={{ padding: '10px 0' }}>
                  Aucun pays enregistré pour le moment — le pays sera collecté à l'inscription (étape suivante).
                </p>
              )}
              {s.countries.slice(0, 8).map(c => (
                <div key={c.code || c.name} className="adm-ctr">
                  <span style={{ fontSize: 12.5, fontWeight: 600, minWidth: 88 }}>{c.name}</span>
                  <span className="adm-bar"><i style={{ width: Math.max(4, Math.round((c.count / maxCountry) * 100)) + '%' }} /></span>
                  <span style={{ fontSize: 13, fontWeight: 700, minWidth: 46, textAlign: 'right' }}>{fmt(c.count)}</span>
                </div>
              ))}
              {s.unknownCountry > 0 && (
                <div className="adm-ctr">
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#98A2B3', minWidth: 88 }}>Non renseigné</span>
                  <span className="adm-bar"><i style={{ width: Math.max(4, Math.round((s.unknownCountry / Math.max(maxCountry, s.unknownCountry)) * 100)) + '%', background: '#CBD5E1' }} /></span>
                  <span style={{ fontSize: 13, fontWeight: 700, minWidth: 46, textAlign: 'right', color: '#98A2B3' }}>{fmt(s.unknownCountry)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div className="card" style={{ padding: 16, background: 'linear-gradient(135deg,#7B3FE4,#C026D3)', border: 'none', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <NavIcon name="message" size={20} color="#fff" glow />
              <span style={{ fontSize: 15.5, fontWeight: 700 }}>Besoin d'aide ?</span>
            </div>
            <p style={{ fontSize: 12.5, opacity: .92, lineHeight: 1.5 }}>
              Consultez la documentation ou contactez l'équipe support Trengo.
            </p>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <p className="adm-h">Statut du système</p>
            <p className="adm-muted" style={{ marginBottom: 8 }}>Tous les systèmes sont opérationnels</p>
            {['Base de données', 'Stockage média', 'Notifications Push', 'API Backend'].map(x => (
              <div key={x} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                <span style={{ fontSize: 12.5, color: '#475467', flex: 1 }}>{x}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#12A48D' }}>
                  Opérationnel <NavIcon name="check" size={14} color="#12A48D" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
