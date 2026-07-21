const fs = require("fs");
process.chdir(__dirname);
const F = "src/App.jsx";
let S = fs.readFileSync(F, "utf8");
const done = [];

// 1) Import fonction AdMob
const oldImport = `import Layout from './components/Layout';`;
const newImport = `import Layout from './components/Layout';
import { initAdMob, showBannerAd } from './utils/admob';`;
if (S.includes(oldImport) && !S.includes("utils/admob")) {
  S = S.replace(oldImport, newImport);
  done.push("Import admob.js ajouté");
}

// 2) Appel au montage de App() (aorian'ny reset flag chunk)
const oldEffect = `  useEffect(() => { sessionStorage.removeItem('tsengo_chunk_retry'); }, []);`;
const newEffect = `  useEffect(() => { sessionStorage.removeItem('tsengo_chunk_retry'); }, []);
  useEffect(() => { initAdMob().then(showBannerAd); }, []);`;
if (S.includes(oldEffect) && !S.includes("initAdMob().then")) {
  S = S.replace(oldEffect, newEffect);
  done.push("Appel initAdMob + showBannerAd ajouté");
}

fs.writeFileSync(F, S);
console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));
if (done.length === 0) console.log("   ⚠️ Tsy nisy nifanaraka — angamba efa novaina taloha.");
