// test-lite-thumbnails.mjs — TESTE ny fonction MARINA ao amin'ny telegram.js
//
// Alaina ao amin'ny fichier ny `canEncodeWebP`, `makeThumb`, `compressImage`
// marina, dia ampandehanina miaraka amin'ny canvas / Image / File sandoka.
// Tsy copie : ny code halefa mihitsy no voatsapa.
//
// Fampandehanana :  node test-lite-thumbnails.mjs
import fs from 'fs';

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) { pass++; console.log('  ✔ ' + label); }
  else { fail++; console.log('  ✘ ' + label + '\n      got  ' + a + '\n      want ' + b); }
};
const ok = (label, cond, info = '') => {
  if (cond) { pass++; console.log('  ✔ ' + label + (info ? '  (' + info + ')' : '')); }
  else { fail++; console.log('  ✘ ' + label + '  ' + info); }
};

/* ── Fakana ny fonction marina ───────────────────────────────────────────── */
const SRC = fs.readFileSync('./src/utils/telegram.js', 'utf8');
function grab(header) {
  const i = SRC.indexOf(header);
  if (i < 0) throw new Error('Tsy hita : ' + header);
  let d = 0, j = SRC.indexOf('{', i), end = -1;
  for (; j < SRC.length; j++) {
    if (SRC[j] === '{') d++;
    else if (SRC[j] === '}') { d--; if (d === 0) { end = j; break; } }
  }
  return SRC.slice(i, end + 1);
}
const fnWebp  = grab('function canEncodeWebP() {');
const fnThumb = grab('export async function makeThumb(file, maxWidth = 360) {')
  .replace('export async function', 'async function');
const fnComp  = grab('async function compressImage(file, maxWidth = 720, quality = 0.62) {');
console.log('📄 canEncodeWebP ' + fnWebp.split('\n').length + ' · makeThumb ' +
            fnThumb.split('\n').length + ' · compressImage ' + fnComp.split('\n').length + ' andalana\n');

/* ── Environnement sandoka ───────────────────────────────────────────────── */
class MockFile {
  constructor(parts, name, opts = {}) {
    this.name = name;
    this.type = opts.type || '';
    this.size = parts.reduce((a, p) => a + (p.__size || 0), 0);
  }
}

function makeEnv({ webp = true, throwOnDataURL = false, blobNull = false,
                   imgW = 1600, imgH = 1200, imgError = false, ratio = 0.02 } = {}) {
  const seen = { mime: null, quality: null, canvasW: 0, canvasH: 0 };

  const document = {
    createElement: () => {
      const c = {
        width: 0, height: 0,
        getContext: () => ({ drawImage() {} }),
        toDataURL: () => {
          if (throwOnDataURL) throw new Error('nope');
          return webp ? 'data:image/webp;base64,AA' : 'data:image/png;base64,AA';
        },
        toBlob: (cb, mime, q) => {
          // Ny canvas ITY no jerena — tsy variable global (nifanindry taloha)
          seen.mime = mime; seen.quality = q;
          seen.canvasW = c.width; seen.canvasH = c.height;
          if (blobNull) { cb(null); return; }
          cb({ __size: Math.round(c.width * c.height * ratio) });
        },
      };
      return c;
    },
  };

  class MockImage {
    set src(_) {
      setTimeout(() => {
        if (imgError) { this.onerror && this.onerror(); return; }
        this.width = imgW; this.height = imgH;
        this.onload && this.onload();
      }, 0);
    }
  }

  const URLm = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };

  const build = new Function('document', 'Image', 'URL', 'File', 'String', 'Math',
    'let _webpOK = null;\n' + fnWebp + '\n' + fnComp + '\n' + fnThumb +
    '\nreturn { canEncodeWebP, compressImage, makeThumb };');
  return { api: build(document, MockImage, URLm, MockFile, String, Math), seen };
}

const img = (name = 'photo.jpg', size = 3_000_000, type = 'image/jpeg') => {
  const f = new MockFile([], name, { type }); f.size = size; return f;
};

/* ═══ 1. Fanamarinana WebP ════════════════════════════════════════════════ */
console.log('1) canEncodeWebP — tsy heverina ho azo');
{
  eq('mahay → true', makeEnv({ webp: true }).api.canEncodeWebP(), true);
  eq('tsy mahay (PNG no valiny) → false', makeEnv({ webp: false }).api.canEncodeWebP(), false);
  eq('mikorontana → false (tsy crash)', makeEnv({ throwOnDataURL: true }).api.canEncodeWebP(), false);
  const e = makeEnv({ webp: true });
  e.api.canEncodeWebP(); 
  eq('voatahiry (cache) — valiny mitovy', e.api.canEncodeWebP(), true);
}

/* ═══ 2. compressImage — WebP sy fallback ════════════════════════════════ */
console.log('\n2) compressImage — endrika sy kalitao');
{
  let e = makeEnv({ webp: true });
  let r = await e.api.compressImage(img());
  eq('mime = image/webp', e.seen.mime, 'image/webp');
  eq('qualité = 0.72', e.seen.quality, 0.72);
  eq('anarana .webp', r.name, 'photo.webp');
  eq('type File', r.type, 'image/webp');

  e = makeEnv({ webp: false });
  r = await e.api.compressImage(img());
  eq('tsy mahay → image/jpeg', e.seen.mime, 'image/jpeg');
  eq('tsy mahay → qualité 0.62', e.seen.quality, 0.62);
  eq('tsy mahay → anarana .jpg', r.name, 'photo.jpg');

  e = makeEnv({ webp: true });
  r = await e.api.compressImage(img('vacances.été.2026.png', 2e6, 'image/png'));
  eq('anarana misy teboka maro voadio', r.name, 'vacances.été.2026.webp');
}

/* ═══ 3. Fanovana habe ═══════════════════════════════════════════════════ */
console.log('\n3) Fanovana habe (ratio voatazona)');
{
  let e = makeEnv({ imgW: 1600, imgH: 1200 });
  await e.api.compressImage(img(), 720);
  eq('1600×1200 → 720×540', [e.seen.canvasW, e.seen.canvasH], [720, 540]);

  e = makeEnv({ imgW: 1600, imgH: 1200 });
  await e.api.compressImage(img(), 360);
  eq('vignette 360 → 360×270', [e.seen.canvasW, e.seen.canvasH], [360, 270]);

  e = makeEnv({ imgW: 300, imgH: 200 });
  await e.api.compressImage(img(), 720);
  eq('sary efa kely → tsy voatarika', [e.seen.canvasW, e.seen.canvasH], [300, 200]);
}

/* ═══ 4. FIAROVANA — tsy very ny sary mihitsy ════════════════════════════ */
console.log('\n4) Fiarovana — tsy very na oviana na oviana');
{
  const f = img();
  let e = makeEnv({ blobNull: true });
  let r = await e.api.compressImage(f);
  ok('toBlob → null : mamerina ny fichier tany am-boalohany', r === f);

  e = makeEnv({ imgError: true });
  r = await e.api.compressImage(f);
  ok('sary tsy voavaky : mamerina ny fichier', r === f);

  e = makeEnv();
  r = await e.api.compressImage(new MockFile([], 'doc.pdf', { type: 'application/pdf' }));
  ok('tsy sary : tsy voakitika', r.name === 'doc.pdf');
}

/* ═══ 5. makeThumb ═══════════════════════════════════════════════════════ */
console.log('\n5) makeThumb — vignette feed');
{
  let e = makeEnv({ imgW: 1600, imgH: 1200, ratio: 0.02 });
  let t = await e.api.makeThumb(img('a.jpg', 3_000_000));
  ok('vignette noforonina', t !== null, t ? t.size + ' octets' : '');
  eq('360 px ny sakany', e.seen.canvasW, 360);
  ok('kely noho ny fichier tany am-boalohany', t && t.size < 3_000_000);

  e = makeEnv();
  eq('tsy sary → null', await e.api.makeThumb(new MockFile([], 'a.mp4', { type: 'video/mp4' })), null);
  eq('null → null (tsy crash)', await e.api.makeThumb(null), null);
  eq('undefined → null', await e.api.makeThumb(undefined), null);

  // Sary efa kely : ny vignette tsy mihena → tsy mendrika
  e = makeEnv({ imgW: 200, imgH: 150, ratio: 0.02 });
  t = await e.api.makeThumb(img('petit.jpg', 500));
  eq('sary efa kely → null (tsy mendrika)', t, null);

  // Fahadisoana anatiny → null, tsy exception
  e = makeEnv({ imgError: true });
  t = await e.api.makeThumb(img('a.jpg', 3_000_000));
  eq('fahadisoana → null (tsy manakana ny publication)', t, null);
}

/* ═══ 6. Fanamarinana statique ═══════════════════════════════════════════ */
console.log('\n6) Fanamarinana statique');
{
  const H = fs.readFileSync('./src/pages/Home.jsx', 'utf8');
  const P = fs.readFileSync('./src/pages/Profile.jsx', 'utf8');
  const G = fs.readFileSync('./src/pages/GroupPage.jsx', 'utf8');
  ok('Home : feed mampiasa thumbURL', H.includes('src={post.thumbURL || post.mediaURL}'));
  ok('Profile : feed mampiasa thumbURL', P.includes('src={post.thumbURL || post.mediaURL}'));
  ok('GroupPage : feed mampiasa thumbURL', G.includes('src={post.thumbURL || post.mediaURL}'));
  ok('PostDetail mitazona mediaURL (fullscreen)',
     fs.readFileSync('./src/pages/PostDetail.jsx', 'utf8').includes('src={post.mediaURL}'));
  ok('makeThumb voafono amin\'ny try/catch ao amin\'ny Home', /try \{[^}]*makeThumb/s.test(H));
  ok('thumbURL default \'\'', H.includes("let thumbURL = '';"));
}

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
