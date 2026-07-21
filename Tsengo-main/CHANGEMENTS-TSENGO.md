# Tsengo — Fanamboarana feno (bug-free, ultra-premium)

Ity no lisitry ny fanovana rehetra natao. Ny build (`npm run build`) sy ny
`node --check` amin'ny backend dia **lasa tsy misy erreur**.

---

## 1. Publication (photo / groupe) tsy niseho na very taorian'ny upload
**Fototra:** `createdAt` simba (lasa map `{_seconds,_nanoseconds}`) tamin'ny migration
taloha. Ny map dia mibahana ny toerana 20 voalohany amin'ny `orderBy('createdAt')`,
ka ny post vaovao tsy tafiditra intsony.
**Vahaolana:**
- **Fil vaovao (Home.jsx)** misy « ordre gelé » : ny filaharana kajiana rehefa
  (chargement / refresh / page vaovao) ihany → tsy mihetsika mandritra ny lecture.
- Ampandehano ny route backend **`/admin/fix-timestamps?secret=NOTIFY_SECRET`**
  indray mandeha hanarenana ny base (efa ao anaty backend).
- **Firestore rules** : nampiana `views` ao amin'ny keys azon'ny rehetra ovaina —
  taloha ny `increment(views)` dia LAVINA ka nandrava ny écriture manontolo.
- Compteur vues: tsy `writeBatch` atomika intsony fa écriture tsirairay.

## 2. Fil d'actualités façon Facebook
- Filaharana raikitra (tsy mihetsika rehefa mijery) → **namaha ny bug
  « long press → compte hafa »**.
- Bouton **« N nouvelles publications »** rehefa misy post vaovao (tsy manakorontana).
- Classement: récence mibahana → post-nao → namana (miseho matetika) → engagement
  → **localisation** + **inscriptions vaovao** → fiovaovana isaky ny refresh.
- Pagination cursor **20/20 hatramin'ny infini**.

## 3. Pull-to-refresh (PullToRefresh.jsx)
- Effet **RESSORT / mievotra** (spring bounce), résistance élastique.
- Logo Tsengo mihodina sy miaina.
- Miandry ny fahavitan'ny refresh MARINA (Promise) — tsy silent no-op intsony.

## 4. Suggestions (Home + Friends)
- Laharam-pahamehana: **amis en commun betsaka indrindra** → mpampiasa vaovao →
  localisation mitovy.

## 5. Sary miseho tapatapaka
- **SmartImage** manao `img.decode()` alohan'ny hampisehoana → miseho amin'ny indray
  mipi-maso, effet **miaina** (scale) + shimmer.
- **PhotoCarousel** manana io effet io amin'ny sary rehetra.

## 6. Thumbnail vidéo tsy niseho amin'ny APK (story, enregistré, profil)
**Fototra:** `<video preload="metadata">` tsy mandoko frame amin'ny Android WebView.
**Vahaolana:** component vaovao **`VideoThumb.jsx`** :
- Poster (thumbURL) aseho amin'ny `<img>` — azo antoka amin'ny WebView.
- Raha tsy misy → maka frame client-side (canvas), raha tsy mety → gradient madio + ▶.
- **Tsy mainty mihitsy.** Nasolo ny endrika rehetra tao Profile/Saved/GroupPage.
- **FeedVideo** koa manana poster overlay azo antoka.

## 7. Video lehibe — erreur amin'ny fanapahana/fandefasana bot
- **telegram.js**: honorém-i ny `retry_after`, fiatoana 250ms eo anelanelan'ny
  morceaux, 6 fanandramana misy backoff mafy (anti-flood).
- **server.js**: ampitaina amin'ny client ny `retry_after` avy amin'ny Telegram.

## 8. Video jejo (Reels)
- Pagination cursor **20/20 hatramin'ny infini** toy ny fil, pré-chargement,
  temps réel eo amin'ny toerany.

## 9. Menu natif Google (copie/coupe/sélection) amin'ny longue press
- **index.css**: `user-select:none` + `-webkit-touch-callout:none` amin'ny APK
  manontolo. **Texte publication ihany** no azo copié (menu manokana « Copier le
  texte » — appui long). Champs saisie ihany no azo édité.
- Namboarina koa ny « longue press message → mivoaka ny chat » (route sync).

## 10. Menu card publication mitovy amin'ny fil
- **Profile** sy **Groupe** : nampiana Enregistrer/Retirer, Identifier, Signaler,
  Bloquer (mitovy amin'ny fil). Boutique/Artiste efa manana menu feno.

## 11. Média mandalo Cloudflare Worker (server.js)
- Ny sary/vidéo dia vakiana amin'ny **Cloudflare Worker** (edge, tsy matory) fa
  tsy ny Render (cold start → sary fotsy).

---

### Dingana farany ho anao
1. Apetraho ny **FIREBASE_RULES.js** vaovao ao amin'ny Firebase Console > Rules.
2. Ampandehano indray mandeha:
   `https://VOTRE-BACKEND.onrender.com/admin/fix-timestamps?secret=NOTIFY_SECRET`
   (soloy ny `NOTIFY_SECRET` marina). Io no hamerina ny post taloha rehetra hiseho.
3. Deploy ny frontend (Vercel) sy backend (Render) toy ny mahazatra, dia rebuild
   ny APK.
