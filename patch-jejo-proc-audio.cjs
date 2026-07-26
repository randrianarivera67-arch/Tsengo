const fs = require('fs');
const p = 'src/components/JejoStudio.jsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('createMediaElementSource(video)')) { console.log('SKIP deja applique'); process.exit(0); }

const OLD_V = "      video.playsInline = true; video.preload = 'auto'; video.muted = false; video.volume = 0.0001;";
if (s.split(OLD_V).length - 1 !== 1) { console.log('ERR ancre volume ('+(s.split(OLD_V).length-1)+')'); process.exit(1); }
s = s.replace(OLD_V, "      video.playsInline = true; video.preload = 'auto'; video.muted = false; video.volume = 1;");

const OLD_A = `          // Audio : gardé seulement si vitesse normale (évite désync/pitch géré nativement)
          let elStream = null;
          try { elStream = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null); } catch {}
          if (elStream) elStream.getAudioTracks().forEach(t => tracks.push(t));`;
if (s.split(OLD_A).length - 1 !== 1) { console.log('ERR ancre audio ('+(s.split(OLD_A).length-1)+')'); process.exit(1); }
s = s.replace(OLD_A, `          // Audio route par Web Audio : volume plein pour l'enregistrement,
          // NON connecte aux haut-parleurs -> silencieux pour l'utilisateur.
          let procAC = null;
          try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) {
              procAC = new AC();
              const srcNode = procAC.createMediaElementSource(video);
              const destNode = procAC.createMediaStreamDestination();
              srcNode.connect(destNode);
              const at = destNode.stream.getAudioTracks()[0];
              if (at) tracks.push(at);
              procACRef = procAC;
            }
          } catch { procAC = null; }
          if (!procAC) {
            let elStream = null;
            try { elStream = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null); } catch {}
            if (elStream) elStream.getAudioTracks().forEach(t => tracks.push(t));
          }`);

const OLD_F = "    const finish = out => { if (settled) return; settled = true; try { if (url) URL.revokeObjectURL(url); } catch {} resolve(out); };";
if (s.split(OLD_F).length - 1 !== 1) { console.log('ERR ancre finish'); process.exit(1); }
s = s.replace(OLD_F, "    let procACRef = null;\n    const finish = out => { if (settled) return; settled = true; try { procACRef?.close(); } catch {} try { if (url) URL.revokeObjectURL(url); } catch {} resolve(out); };");

fs.writeFileSync(p, s);
console.log('OK : audio conserve apres decoupe / vitesse / filtre');
