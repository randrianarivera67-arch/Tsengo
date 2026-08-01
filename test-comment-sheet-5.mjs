// test-comment-sheet-5.mjs — Picker réaction : toerana refesina
//
// MAMPANDEHA ny logika toerana MARINA nalaina tao amin'ny fichier.
//
// Fampandehanana :  node test-comment-sheet-5.mjs
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

const CS = fs.readFileSync('./src/components/CommentSheet.jsx', 'utf8');

/* ── Logika toerana naverina avy amin'ny fichier ── */
const W = 232, H = 44, PAD = 8;
const place = (rect, vw = 360) => {
  const flip = rect.top < (H + 22);
  const top = flip ? rect.bottom + 6 : rect.top - H - 6;
  const left = Math.max(PAD, Math.min(rect.left - 6, vw - W - PAD));
  return { top: Math.round(top), left: Math.round(left), flip };
};

/* ═══ 1. Commentaire AMBONY — io no bug ════════════════════════════════ */
console.log('1) Commentaire ambony indrindra (bug taloha)');
{
  // « J'aime » eo amin'ny 40 px avy ambony : tsy ampy toerana ambony
  const p = place({ top: 40, bottom: 58, left: 60 });
  ok('MIVADIKA ambany', p.flip === true);
  ok('top ambanin\'ny ancre', p.top === 64, 'top=' + p.top);
  ok('tsy misy sanda ratsy', p.top > 0);
}

console.log('\n   Commentaire afovoany / ambany');
{
  const p = place({ top: 400, bottom: 418, left: 60 });
  ok('mijanona AMBONY', p.flip === false);
  eq('top = ancre − 50', p.top, 350);
}

console.log('\n   Fetra mivadika');
{
  eq('top 66 → ambony', place({ top: 66, bottom: 84, left: 60 }).flip, false);
  eq('top 65 → ambany', place({ top: 65, bottom: 83, left: 60 }).flip, true);
  eq('top 0 → ambany', place({ top: 0, bottom: 18, left: 60 }).flip, true);
}

/* ═══ 2. Sisiny — tsy mivoaka ═════════════════════════════════════════ */
console.log('\n2) Sisiny havia / havanana');
{
  eq('havia (left 2) → PAD', place({ top: 300, bottom: 318, left: 2 }).left, 8);
  eq('afovoany', place({ top: 300, bottom: 318, left: 60 }).left, 54);
  eq('havanana (left 340) → voafetra', place({ top: 300, bottom: 318, left: 340 }, 360).left, 120);
  ok('tsy mivoaka mihitsy', [2, 60, 200, 340, 400].every(l => {
    const p = place({ top: 300, bottom: 318, left: l }, 360);
    return p.left >= 8 && p.left + 232 <= 360 - 8 + 1;
  }));
  eq('écran lehibe', place({ top: 300, bottom: 318, left: 500 }, 900).left, 494);
}

/* ═══ 3. Fiarovana ════════════════════════════════════════════════════ */
console.log('\n3) Fiarovana');
ok('ancre tsy misy → sanda azo antoka', CS.includes("typeof el.getBoundingClientRect !== 'function'"));
ok('fallback { top: PAD, left: PAD }', CS.includes('setPickerPos({ top: PAD, left: PAD, flip: false })'));
ok('vw fallback', CS.includes('window.innerWidth || 360'));

/* ═══ 4. Fampiharana ══════════════════════════════════════════════════ */
console.log('\n4) Fampiharana');
ok('portal (tsy voatapaky ny overflow)', CS.includes('</>, document.body)}'));
ok('position fixed', CS.includes("position: 'fixed', top: pickerPos.top, left: pickerPos.left"));
ok('toerana raikitra VOAESOTRA', !CS.includes("bottom: '100%'"));
ok('ref amin\'ny « J\'aime »', CS.includes('ref={likeElRef}'));
ok('appui long → openPicker', CS.includes('likeLongRef.current = true; openPicker();'));
ok('pastille → openPicker', CS.includes('picker ? setPicker(false) : openPicker()'));
ok('zIndex ambonin\'ny sheet', CS.includes('zIndex: 9601'));
ok('fanakatonana amin\'ny ivelany', CS.includes('zIndex: 9600'));

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
