// src/utils/photoPost.js
// ─────────────────────────────────────────────────────────────────────────────
// Endrika post ho an'ny "fanovana photo de profil / couverture".
// Iombonan'ny Profile.jsx sy Register.jsx (inscription) — mba MITOVY TSY MISY
// DISO ny post amin'ny toerana roa, ka miseho MITOVY ao amin'ny fil sy profil.
//   • createdAt tsy tafiditra eto (serverTimestamp() ampiana any amin'ny mpiantso,
//     satria fonction Firebase izy, tsy azo tsapaina).
// ─────────────────────────────────────────────────────────────────────────────

function str(v) { return v == null ? '' : String(v); }

/**
 * Post "photo de profil".
 * @param {object} a - { uid, url, fullName, username, isVip }
 */
export function profilePhotoPost(a = {}) {
  a = a || {};
  return {
    uid: str(a.uid),
    authorName: str(a.fullName),
    authorPhoto: str(a.url),          // ny sary vaovao ihany no avatar (mifanaraka amin'ny Profil)
    authorUsername: str(a.username),
    authorIsVip: a.isVip === true,
    content: '📸 a mis à jour sa photo de profil',
    mediaURL: str(a.url),
    mediaType: 'image',
    isProfilePhoto: true,
    reactions: {},
    comments: [],
  };
}

/**
 * Post "photo de couverture".
 * @param {object} a - { uid, url, fullName, username, isVip, authorPhoto }
 *   authorPhoto = sarin'ny profil (mety efa nampidirina teo aloha na '')
 */
export function coverPhotoPost(a = {}) {
  a = a || {};
  return {
    uid: str(a.uid),
    authorName: str(a.fullName),
    authorPhoto: str(a.authorPhoto),  // sarin'ny profil (fa tsy ny couverture)
    authorUsername: str(a.username),
    authorIsVip: a.isVip === true,
    content: 'Photo de couverture',
    mediaURL: str(a.url),
    mediaType: 'image',
    isCoverPhoto: true,
    reactions: {},
    comments: [],
  };
}
