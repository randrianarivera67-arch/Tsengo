const fs = require('fs');
const p = 'src/components/JejoStudio.jsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('rawTrack')) { console.log('SKIP deja applique'); process.exit(0); }

const OLD = `  async function buildRecordStream() {
    const canvas = canvasRef.current;
    const vTrack = canvas.captureStream(30).getVideoTracks()[0];
    const tracks = [vTrack];`;
if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre buildRecordStream ('+(s.split(OLD).length-1)+')'); process.exit(1); }

s = s.replace(OLD, `  async function buildRecordStream() {
    const canvas = canvasRef.current;
    // Sans effet : piste video de la CAMERA (sync parfaite avec l'audio).
    // Avec effet : canvas, comme avant.
    let rawTrack = null;
    try {
      if (!beautyOn && filterKey === 'none') rawTrack = streamRef.current?.getVideoTracks?.()[0] || null;
    } catch { rawTrack = null; }
    const vTrack = rawTrack || canvas.captureStream(30).getVideoTracks()[0];
    const tracks = [vTrack];`);

fs.writeFileSync(p, s);
console.log('OK : enregistrement direct camera quand aucun effet (sync parfaite)');
