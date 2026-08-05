import { useNavigate } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi";

const GAMES = [
  { id: "fanorona", name: "Fanorona", desc: "Lalao malagasy ancestral",
    img: "/fanorona-icon.png", path: "/games/fanorona" },
];

export default function Games() {
  const navigate = useNavigate();
  // Apparence CLAIRE foana — tsy manaraka ny thème an'ny app.
  const bg     = "#F5F6F8";
  const cardBg = "white";
  const text   = "#1A1D24";
  const mut    = "#65676B";
  const bdr    = "#E5E7EB";
  const isDark = false;

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "14px 14px 90px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button onClick={() => navigate(-1)}
          style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid " + bdr,
                   background: cardBg, cursor: "pointer", display: "flex",
                   alignItems: "center", justifyContent: "center" }}>
          <HiArrowLeft size={18} color={text} />
        </button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: text }}>Jeux</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {GAMES.map(g => (
          <button key={g.id} onClick={() => navigate(g.path)}
            style={{ padding: 14, borderRadius: 18, border: "1px solid " + bdr,
                     background: cardBg, cursor: "pointer", display: "flex",
                     flexDirection: "column", alignItems: "center", gap: 10,
                     boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
            <img src={g.img} alt={g.name}
              style={{ width: 72, height: 72, borderRadius: 16, objectFit: "cover",
                       background: isDark ? "#2A2E38" : "#F0F2F5" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: text }}>{g.name}</div>
              <div style={{ fontSize: 11, color: mut, marginTop: 3 }}>{g.desc}</div>
            </div>
          </button>
        ))}
        <div style={{ padding: 14, borderRadius: 18, border: "1.5px dashed " + bdr,
                      display: "flex", flexDirection: "column", alignItems: "center",
                      justifyContent: "center", gap: 8, minHeight: 160 }}>
          <div style={{ fontSize: 28, opacity: .4 }}>🎮</div>
          <div style={{ fontSize: 11, color: mut, textAlign: "center" }}>Bientôt plus de jeux !</div>
        </div>
      </div>
    </div>
  );
}
