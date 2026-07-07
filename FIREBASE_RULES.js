// =============================================
// FIREBASE FIRESTORE RULES — v2 SECURE
// Asiana ao amin'ny Firebase Console > Firestore > Rules
// =============================================

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users — afaka mamaky ny rehetra, afaka manova ny anazy ihany
    // ✅ FIX: Protected fields (isAdmin, isVip) cannot be written by users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId
        && !('isAdmin' in request.resource.data)
        && !('isVip' in request.resource.data);
      allow update: if request.auth != null && (
        (request.auth.uid == userId
          && !request.resource.data.diff(resource.data).affectedKeys()
              .hasAny(['isAdmin', 'isVip', 'uid', 'email']))
        ||
        // ✅ Follow/Unfollow : ny olona hafa dia afaka manova ny "followers" ihany
        (request.auth.uid != userId
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['followers']))
      );
    }

    // ✅ Groupes (chat + publications) — admins gérés
    match /groups/{groupId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.admins.hasAny([request.auth.uid])
        && request.resource.data.members.hasAny([request.auth.uid]);
      // Admin : tout modifier / supprimer. Membre : uniquement quitter (retirer soi-même)
      allow update: if request.auth != null &&
        (
          resource.data.admins.hasAny([request.auth.uid])
          ||
          // Non-admin : peut uniquement rejoindre/quitter (champ members)
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(['members'])
        );
      allow delete: if request.auth != null && resource.data.admins.hasAny([request.auth.uid]);
    }

    // ✅ Stories (24h) — chacun crée/supprime les siennes
    match /stories/{storyId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      // ✅ Réactions : ny olona rehetra afaka manova ny champ "reactions" irery ;
      // ny tompony afaka manova ny zavatra rehetra
      allow update: if request.auth != null && (
        resource.data.uid == request.auth.uid ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reactions'])
      );
      allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
    }

    // ✅ Sera (Pages publiques) — admin(s) manova/mamafa ; ny rehetra afaka manova "followers"
    match /pages/{pageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.admins.hasAny([request.auth.uid]);
      allow update: if request.auth != null && (
        resource.data.admins.hasAny([request.auth.uid]) ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['followers'])
      );
      allow delete: if request.auth != null && resource.data.admins.hasAny([request.auth.uid]);
    }

        // ✅ Artistes — admin(s) manova/mamafa ; ny rehetra afaka manova "followers"
    match /artists/{artistId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.admins.hasAny([request.auth.uid]);
      allow update: if request.auth != null && (
        resource.data.admins.hasAny([request.auth.uid]) ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['followers'])
      );
      allow delete: if request.auth != null && resource.data.admins.hasAny([request.auth.uid]);
    }

    // ✅ Boutiques — admin(s) manova/mamafa ; ny rehetra afaka manova "followers"
    match /shops/{shopId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.admins.hasAny([request.auth.uid]);
      allow update: if request.auth != null && (
        resource.data.admins.hasAny([request.auth.uid]) ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['followers'])
      );
      allow delete: if request.auth != null && resource.data.admins.hasAny([request.auth.uid]);
    }

        // ✅ Bloc-notes — an-tsokosoko : ny tompony ihany no mahita/manoratra
    match /notes/{noteId} {
      allow read, update, delete: if request.auth != null && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
    }

        // ✅ Signalements — ny mpandefa ihany no mahita/manoratra ny azy, tsy azo ovaina
    match /reports/{reportId} {
      allow create: if request.auth != null && request.resource.data.reportedBy == request.auth.uid;
      allow read: if request.auth != null && resource.data.reportedBy == request.auth.uid;
    }

        // ✅ Événements — ny mpamorona no manova/mamafa ; ny rehetra afaka
    // manova attendees/interested (RSVP)
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.createdBy == request.auth.uid;
      allow update: if request.auth != null && (
        resource.data.createdBy == request.auth.uid ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['attendees', 'interested'])
      );
      allow delete: if request.auth != null && resource.data.createdBy == request.auth.uid;
    }

    // ✅ Petites annonces — ny mpamorona ihany no manova/mamafa
    match /announcements/{annId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.uid == request.auth.uid;
    }

    // Posts — afaka mamaky ny rehetra, afaka manoratra raha authenticated
    // ✅ FIX: isBoosted/boostUntil cannot be written by regular users
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && !('isBoosted' in request.resource.data)
        && request.resource.data.content is string
        && request.resource.data.content.size() <= 2000;
      allow update: if request.auth != null &&
        (
          // Owner can edit content only (not boost fields)
          (resource.data.uid == request.auth.uid
            && !request.resource.data.diff(resource.data).affectedKeys()
                .hasAny(['isBoosted', 'boostUntil', 'boostDays', 'boostedAt', 'uid']))
          ||
          // Anyone authenticated can update reactions and comments arrays only
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reactions', 'comments'])
        );
      allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
    }

    // Notifications
    match /notifications/{notifId} {
      allow read: if request.auth != null && resource.data.toUid == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.fromUid == request.auth.uid;
      allow update: if request.auth != null && resource.data.toUid == request.auth.uid
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read']);
      allow delete: if request.auth != null && resource.data.toUid == request.auth.uid;
    }

    // Friend requests
    match /friendRequests/{reqId} {
      allow read: if request.auth != null &&
        (resource.data.fromUid == request.auth.uid || resource.data.toUid == request.auth.uid);
      allow create: if request.auth != null
        && request.resource.data.fromUid == request.auth.uid;
      allow update: if request.auth != null && resource.data.toUid == request.auth.uid
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status']);
      allow delete: if request.auth != null &&
        (resource.data.fromUid == request.auth.uid || resource.data.toUid == request.auth.uid);
    }
  }
}

// =============================================
// FIREBASE REALTIME DATABASE RULES
// Asiana ao amin'ny Firebase Console > Realtime Database > Rules
// =============================================
/*
{
  "rules": {
    "conversations": {
      // ✅ FIX CRITIQUE : l'app lit la LISTE via ref('conversations') (la racine).
      // Sans ".read" ici, Firebase refuse tout → aucune discussion visible,
      // et l'envoi de messages échouait aussi selon la config.
      ".read": "auth != null",
      "$chatId": {
        ".write": "auth != null && ($chatId.contains(auth.uid) || $chatId.beginsWith('group_'))",
        "messages": {
          "$msgId": {
            // ✅ FIX "Vu" : ny validate taloha nitaky fromUid === auth.uid isaky ny
            // écriture, ka ny mpandray tsy afaka nanamarika "read: true" mihitsy
            // (ny fromUid dia an'ilay mpandefa). Izao : ny fromUid dia voaaro
            // (tsy azo soloina, ary ny mpandefa ihany no mametraka azy am-boalohany),
            // fa ny read/reactions/edited dia azo soratana.
            ".validate": "newData.hasChildren(['fromUid', 'text', 'ts'])",
            "fromUid": {
              ".validate": "(!data.exists() && newData.val() === auth.uid) || newData.val() === data.val()"
            },
            "text": {
              ".validate": "newData.isString() && newData.val().length <= 2000"
            }
          }
        }
      }
    },
    "online": {
      // ✅ FIX : l'app lit aussi ref('online') à la racine (statut en ligne)
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && $uid === auth.uid"
      }
    }
  }
}
*/

// =============================================
// FIREBASE STORAGE RULES
// Asiana ao amin'ny Firebase Console > Storage > Rules
// =============================================
/*
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /posts/{userId}/{fileName} {
      allow read: if request.auth != null;
      // ✅ FIX: Combined conditions on ONE line (no dangling &&)
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 50 * 1024 * 1024
        && (request.resource.contentType.matches('image/.*') || request.resource.contentType.matches('video/.*'));
    }
    match /avatars/{userId} {
      allow read: if request.auth != null;
      // ✅ FIX: Syntax error corrected — all conditions on same allow statement
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
*/
