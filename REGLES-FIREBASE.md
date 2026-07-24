# Règles Realtime Database — Tsengo / Trengo

## Aiza no apetraka

Firebase Console → **Realtime Database** → onglet **Règles** → apetaka → **Publier**.

---

## DINGANA A — apetaka IZAO (miaraka amin'ny v16)

Ampio ny bloc `userChats` ao anatin'ny règles efa misy anao. **Aza esorina ny bloc
hafa** (`conversations`, `online`, sns.) — ampiana fotsiny ity :

```json
{
  "rules": {

    "userChats": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",

        "$chatId": {
          ".write": "auth != null && ($chatId.contains(auth.uid) || $chatId.beginsWith('group_') || $chatId.beginsWith('shop_') || $chatId.beginsWith('artist_') || $chatId.beginsWith('page_'))"
        }
      }
    }

  }
}
```

**Dikany :**

- `.read` — ny olona **tsy afaka mamaky afa-tsy ny lisitry ny resany manokana**.
- `.write` — ilaina mba ahafahan'ny mpandefa manavao ny badge "tsy vaky" an'ny
  mpandray (fan-out). Voafetra amin'ny resaka misy azy (direct) na amin'ny
  groupe/boutique/artiste.

⚠️ Amin'ity dingana ity, **aza ovaina ny bloc `conversations`**. Mbola ilaina ny
famakiana azy ho an'ny **migration** (fisokafana voalohany an'ny mpampiasa
tsirairay, indray mandeha ihany).

---

## DINGANA B — rehefa afaka 2 na 3 herinandro

Rehefa efa nanokatra ny app indray mandeha farafahakeliny ny ankamaroan'ny
mpampiasa (vita ny migration), dia azo hidiana ny `conversations` :

```json
"conversations": {
  ".read": false,

  "$chatId": {
    ".read": "auth != null && ($chatId.contains(auth.uid) || $chatId.beginsWith('group_') || $chatId.beginsWith('shop_') || $chatId.beginsWith('artist_') || $chatId.beginsWith('page_'))",
    ".write": "auth != null && ($chatId.contains(auth.uid) || $chatId.beginsWith('group_') || $chatId.beginsWith('shop_') || $chatId.beginsWith('artist_') || $chatId.beginsWith('page_'))"
  }
}
```

Ny `".read": false` eo amin'ny fototra no **manakana ny famakiana ny resaky ny
olona rehetra**. Ny resaka tsirairay kosa mbola azo vakiana ho an'izay
mikasika azy.

⚠️ **Aza atao izao ny dingana B.** Raha misy mpampiasa mbola tsy nanokatra ny
app taorian'ny fanavaozana, dia ho very ny lisitry ny resany (mandra-pahazoany
hafatra vaovao). Andraso ho vita aloha ny migration.

---

## Fanamarihana momba ny vidiny

Ny Realtime Database dia mandoa **$5 isaky ny Go nalaina**.

| Mpampiasa | Taloha (isaky ny fisokafana) | Izao |
|---|---|---|
| 100 | ~150 Ko | ~3 Ko |
| 1 000 | ~1,5 Mo | ~3 Ko |
| 5 000 | ~7,5 Mo | ~3 Ko |
| 100 000 | ~150 Mo | ~3 Ko |

Ny habe alaina dia **tsy miova intsony** na firy na firy ny mpampiasa — ny
resakao ihany no alaina.
