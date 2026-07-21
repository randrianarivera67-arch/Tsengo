const fs = require("fs");
process.chdir(__dirname);
const F = "src/App.jsx";
let S = fs.readFileSync(F, "utf8");
const done = [];

// 1) Import Component + useEffect
const oldImport = `import { lazy, Suspense } from 'react';`;
const newImport = `import { lazy, Suspense, Component, useEffect } from 'react';`;
if (S.includes(oldImport)) { S = S.replace(oldImport, newImport); done.push("Import Component/useEffect"); }

// 2) Ajout de l'ErrorBoundary (juste après l'import de Layout)
const oldAfterLayout = `import Layout from './components/Layout';`;
const newAfterLayout = `import Layout from './components/Layout';

// ── Miaro rehefa efa lasibatra ela ilay app: mety mitady fichier (chunk) taloha
//    izay tsy any Vercel intsony → mahatonga pejy fotsy. Averina refresh mangina
//    indray mandeha ihany (miaro tsy ho boucle infini amin'ny alalan'ny sessionStorage). ──
const CHUNK_ERROR_RE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i;

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error) {
    const isChunkError = CHUNK_ERROR_RE.test(error?.message || '');
    const alreadyRetried = sessionStorage.getItem('tsengo_chunk_retry') === '1';
    if (isChunkError && !alreadyRetried) {
      sessionStorage.setItem('tsengo_chunk_retry', '1');
      window.location.reload();
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:20, textAlign:'center', fontFamily:'Poppins' }}>
          <p style={{ fontWeight:700, fontSize:16, color:'#050505' }}>Nisy olana teo am-pandefasana ny app</p>
          <p style={{ fontSize:13, color:'#65676B' }}>Andramo averina sokafana na tsindrio ity bokitra ity.</p>
          <button
            onClick={() => { sessionStorage.removeItem('tsengo_chunk_retry'); window.location.reload(); }}
            style={{ background:'#1877F2', border:'none', borderRadius:20, padding:'10px 22px', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'Poppins' }}>
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}`;
if (S.includes(oldAfterLayout) && !S.includes("class ErrorBoundary")) { S = S.replace(oldAfterLayout, newAfterLayout); done.push("ErrorBoundary ajouté"); }

// 3) Envelopper AppRoutes avec ErrorBoundary + clear du flag au montage
const oldExport = `export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}`;
const newExport = `export default function App() {
  useEffect(() => { sessionStorage.removeItem('tsengo_chunk_retry'); }, []);

  return (
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </BrowserRouter>
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}`;
if (S.includes(oldExport)) { S = S.replace(oldExport, newExport); done.push("AppRoutes enveloppé + reset flag"); }

fs.writeFileSync(F, S);
console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));
if (done.length === 0) console.log("   ⚠️ Tsy nisy nifanaraka — angamba efa novaina taloha.");
