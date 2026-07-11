const fs = require("fs");
process.chdir(__dirname);
const F = "src/pages/ArtistDetail.jsx";
let S = fs.readFileSync(F, "utf8");
if (S.includes("HiCog")) { console.log("Deja fait."); process.exit(0); }
const old = "  HiMusicNote, HiVideoCamera, HiPhotograph\n} from 'react-icons/hi';";
const neu = "  HiMusicNote, HiVideoCamera, HiPhotograph, HiCog, HiBan, HiFlag,\n  HiInformationCircle, HiDownload, HiLightningBolt\n} from 'react-icons/hi';";
if (S.includes(old)) {
  S = S.replace(old, neu);
  fs.writeFileSync(F, S);
  console.log("✅ Icônes importées : HiCog, HiBan, HiFlag, HiInformationCircle, HiDownload, HiLightningBolt");
} else {
  console.log("⚠️ Ancre introuvable — envoie-moi : sed -n '15,20p' src/pages/ArtistDetail.jsx");
}
