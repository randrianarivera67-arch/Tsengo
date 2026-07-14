const fs = require('fs');
const p = '.github/workflows/build-native.yml';
let s = fs.readFileSync(p, 'utf8');

const oldStep =
`      - name: Write google-services.json
        env:
          GOOGLE_SERVICES_JSON: \${{ secrets.GOOGLE_SERVICES_JSON }}
        run: |
          if [ -n "$GOOGLE_SERVICES_JSON" ]; then
            echo "$GOOGLE_SERVICES_JSON" | base64 -d > android/app/google-services.json
            echo "google-services.json ecrit"
          else
            echo "secret GOOGLE_SERVICES_JSON manquant - push natif desactive"
          fi`;

const newStep =
`      - name: Write google-services.json
        env:
          GOOGLE_SERVICES_JSON: \${{ secrets.GOOGLE_SERVICES_JSON }}
        run: |
          if [ -n "$GOOGLE_SERVICES_JSON" ]; then
            printf '%s' "$GOOGLE_SERVICES_JSON" | tr -d '[:space:]' | base64 -d > android/app/google-services.json
            echo "=== google-services.json ecrit ==="
            ls -l android/app/google-services.json
            echo "--- package_name detecte ---"
            grep -o '"package_name": *"[^"]*"' android/app/google-services.json || echo "!! JSON INVALIDE (decode echoue)"
          else
            echo "!! secret GOOGLE_SERVICES_JSON MANQUANT"
            exit 1
          fi`;

if (s.includes(newStep.split('\n')[6])) { console.log('deja fait'); process.exit(0); }
if (!s.includes(oldStep)) { console.log('ancre step introuvable (ok si deja modifie)'); process.exit(0); }
s = s.replace(oldStep, newStep);
fs.writeFileSync(p, s);
console.log('OK step google-services renforce (tr -d espaces + verif)');
