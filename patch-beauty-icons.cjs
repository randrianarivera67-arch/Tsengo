const fs = require('fs');
const p = 'src/components/JejoStudio.jsx';
let s = fs.readFileSync(p, 'utf8');
const done = [];

if (s.includes('const FxIc')) { console.log('SKIP deja applique'); process.exit(0); }

const aS = "function Slider({ label, value, onChange }) {";
if (s.split(aS).length - 1 !== 1) { console.log('ERR ancre Slider ('+(s.split(aS).length-1)+')'); process.exit(1); }
s = s.replace(aS, `// Pictogrammes des effets de beaute (SVG)
const FxIc = {
  smooth: (sz = 16) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <path d="M12 3.5c3.2 3.6 5.2 6.2 5.2 8.7a5.2 5.2 0 1 1-10.4 0c0-2.5 2-5.1 5.2-8.7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="M10 12.6a2.4 2.4 0 0 0 2.4 2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  teint: (sz = 16) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <path d="M10 3h4v3l1.6 2.2c.5.7.8 1.5.8 2.4V19a2 2 0 0 1-2 2H9.6a2 2 0 0 1-2-2v-8.4c0-.9.3-1.7.8-2.4L10 6V3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="M7.7 13.5h8.7" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  blush: (sz = 16) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="13" rx="6" ry="4.4" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M12 4.6v2M17.6 6.9l-1.4 1.4M6.4 6.9l1.4 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  lips: (sz = 16) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <path d="M9.5 10.5h5V20a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="M10.4 10.5V5.6c0-.9.7-1.6 1.6-1.6s1.6.7 1.6 1.6v4.9" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
    </svg>
  ),
};

${aS}`);
done.push('icones');

const OLD_SL = `        <span style={{ color: 'rgba(255,255,255,.75)', fontSize: 12.5 }}>{label}</span>`;
if (s.split(OLD_SL).length - 1 !== 1) { console.log('ERR ancre label Slider ('+(s.split(OLD_SL).length-1)+')'); process.exit(1); }
s = s.replace(OLD_SL, `        <span style={{ color: 'rgba(255,255,255,.75)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          {icon ? <span style={{ color: '#F2B300', display: 'flex' }}>{icon}</span> : null}{label}
        </span>`);
s = s.replace("function Slider({ label, value, onChange }) {", "function Slider({ label, value, onChange, icon }) {");
done.push('Slider');

const OLD3 = `                <Slider label="Lisser la peau" value={bSmooth} onChange={setBSmooth} />
                <Slider label="Fond de teint" value={bTeint} onChange={setBTeint} />
                <Slider label="Blush" value={bBlush} onChange={setBBlush} />`;
if (s.split(OLD3).length - 1 !== 1) { console.log('ERR ancre curseurs ('+(s.split(OLD3).length-1)+')'); process.exit(1); }
s = s.replace(OLD3, `                <Slider label="Lisser la peau" value={bSmooth} onChange={setBSmooth} icon={FxIc.smooth(16)} />
                <Slider label="Fond de teint" value={bTeint} onChange={setBTeint} icon={FxIc.teint(16)} />
                <Slider label="Blush" value={bBlush} onChange={setBBlush} icon={FxIc.blush(16)} />`);
done.push('curseurs');

const OLD4 = `                  <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 12.5, marginBottom: 8 }}>Rouge à lèvres</p>`;
if (s.split(OLD4).length - 1 !== 1) { console.log('ERR ancre titre levres ('+(s.split(OLD4).length-1)+')'); process.exit(1); }
s = s.replace(OLD4, `                  <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 12.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#F2B300', display: 'flex' }}>{FxIc.lips(16)}</span>Rouge à lèvres
                  </p>`);
done.push('levres');

fs.writeFileSync(p, s);
console.log('OK : ' + done.join(', '));
