const fs = require("fs");
process.chdir(__dirname);
const F = "src/pages/ArtistDetail.jsx";
let S = fs.readFileSync(F, "utf8");
const old = "  HiMusicNote, HiVideoCamera, HiPhotograph\n} from 'react-icons/hi';";
const neu = "  HiMusicNote, HiVideoCamera, HiPhotograph, HiCog, HiBan, HiFlag,\n  HiInformationCircle, HiDownload, HiLightningBolt\n} from 'react-icons/hi';";
if (S.includes(neu)) { console.log("Deja fait."); process.exit(0); }
if (!S.includes(old)) { console.log("⚠️ Ancre introuvable"); process.exit(1); }
S = S.replace(old, neu);
fs.writeFileSync(F, S);
console.log("✅ Icônes importées");
