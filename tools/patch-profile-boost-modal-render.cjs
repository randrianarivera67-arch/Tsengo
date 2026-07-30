// Ajoute le rendu <BoostOrderModal/> (ancre exacte verifiee sur le fichier reel).
const fs = require('fs');
const p = 'src/pages/Profile.jsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('<BoostOrderModal target={boostTarget}')) {
  console.log('SKIP deja present');
} else {
  const old = `      )}
    </div>
    </>
  );`;
  const neu = `      )}
      {boostTarget && (
        <BoostOrderModal target={boostTarget} onClose={() => setBoostTarget(null)} />
      )}
    </div>
    </>
  );`;
  const n = s.split(old).length - 1;
  if (n !== 1) {
    console.log('FAIL ancre trouvee ' + n + ' fois (attendu 1) - verification manuelle necessaire');
    process.exit(1);
  }
  s = s.replace(old, neu);
  fs.writeFileSync(p, s);
  console.log('OK BoostOrderModal ajoute au rendu final');
}
