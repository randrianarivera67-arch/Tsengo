// patch-video-large.cjs  (FRONTEND — src/utils/telegram.js)
// Olana : ny video > 12 Mo dia nandalo CHUNK (tsy misy compression, moov eo amin'ny
// farany) → izay ilay "loading lalandava" amin'ny video 2-3 min.
// Vahaolana : ny video ≤ 45 Mo dia alefa AMIN'NY UPLOAD TOKANA → ny backend no
// manamaivana azy (ffmpeg 720p + faststart). Ny > 45 Mo ihany no chunk (toy ny teo).
// Idempotent.
const fs = require('fs');
const p = 'src/utils/telegram.js';
let s = fs.readFileSync(p, 'utf8');

const OLD = "const CHUNK_THRESHOLD = 12 * 1024 * 1024;   // vidéo > 12 Mo → envoi en morceaux";
const NEW = "const CHUNK_THRESHOLD = 45 * 1024 * 1024;   // vidéo > 45 Mo → envoi en morceaux (≤45 Mo : upload tokana → compression ffmpeg + faststart ao amin'ny backend)";

if (s.includes(NEW)) { console.log('⏭️  Deja applique.'); process.exit(0); }
const n = s.split(OLD).length - 1;
if (n !== 1) { console.log('❌ ancre introuvable/multiple (' + n + ')'); process.exit(1); }
s = s.replace(OLD, NEW);
fs.writeFileSync(p, s);
console.log('✅ Seuil chunk : 12 Mo → 45 Mo (video ≤45 Mo ho voacompresser ao amin ny backend).');
