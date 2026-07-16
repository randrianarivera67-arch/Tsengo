// =============================================
// FIREBASE FIRESTORE RULES — v3 SECURE + ADMIN
// Asiana ao amin'ny Firebase Console > Firestore > Rules
// =============================================

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 🔑 Admin plateforme : champ isAdmin==true ao amin'ny doc users azy
    function isAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // Users — afaka mamaky ny rehetra, afaka manova ny anazy ihany
    // ✅ Protected fields (isAdmin, isVip) tsy azon'ny user tsotra soratana ;
    //    fa ny ADMIN dia afaka manova (VIP, isBanned, disabled, ...).
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId
        && !('isAdmin' in request.resource.data)
        && !('isVip' in request.resource.data);
      allow update: if request.auth != null && (
        isAdmin() ||
        (request.auth.uid == userId
          && !request.resource.data.diff(resource.data).affectedKeys()
              .hasAny(['isAdmin', 'isVip', 'uid', 'email', 'isBanned', 'disabled']))
        ||
        // ✅ Follow/Unfollow : ny olona hafa dia afaka manova ny "followers" ihany
        (request.auth.uid != userId
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['followers']))
      );
    }

    // ✅ Groupes (chat + publications) — admins gérés (+ admin plateforme)
    match /groups/{groupId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.admins.hasAny([request.auth.uid])
        && request.resource.data.members.hasAny([request.auth.uid]);
      allow update: if request.auth != null &&
        (
          isAdmin() ||
          resource.data.admins.hasAny([request.auth.uid])
          ||
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(['members'])
        );
      allow delete: if request.auth != null && (isAdmin() || resource.data.admins.hasAny([request.auth.uid]));
    }

    // ✅ Stories (24h) — chacun crée/supprime les siennes
    match /stories/{storyId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow update: if request.auth != null && (
        isAdmin() ||
        resource.data.uid == request.auth.uid ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reactions', 'viewers'])
      );
      allow delete: if request.auth != null && (isAdmin() || resource.data.uid == request.auth.uid);
    }

    // ✅ Sera (Pages publiques) — admin(s) manova/mamafa ; ny rehetra "followers"
    match /pages/{pageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.admins.hasAny([request.auth.uid]);
      allow update: if request.auth != null && (
        isAdmin() ||
        resource.data.admins.hasAny([request.auth.uid]) ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['followers'])
      );
      allow delete: if request.auth != null && (isAdmin() || resource.data.admins.hasAny([request.auth.uid]));
    }

    // ✅ Artistes — admin(s) manova/mamafa ; admin plateforme feno (vérif/suppr.)
    match /artists/{artistId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.admins.hasAny([request.auth.uid]);
      allow update: if request.auth != null && (
        isAdmin() ||
        resource.data.admins.hasAny([request.auth.uid]) ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['followers'])
      );
      allow delete: if request.auth != null && (isAdmin() || resource.data.admins.hasAny([request.auth.uid]));
    }

    // ✅ Boutiques — admin(s) manova/mamafa ; admin plateforme feno (vérif/suppr.)
    match /shops/{shopId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.admins.hasAny([request.auth.uid]);
      allow update: if request.auth != null && (
        isAdmin() ||
        resource.data.admins.hasAny([request.auth.uid]) ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['followers'])
      );
      allow delete: if request.auth != null && (isAdmin() || resource.data.admins.hasAny([request.auth.uid]));
    }

    // ✅ Bloc-notes — an-tsokosoko : ny tompony ihany
    match /notes/{noteId} {
      allow read, update, delete: if request.auth != null && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
    }

    // ✅ Signalements — ny mpandefa mahita ny azy ; ny admin mahita ny rehetra
    match /reports/{reportId} {
      allow create: if request.auth != null && request.resource.data.reportedBy == request.auth.uid;
      allow read: if request.auth != null && (isAdmin() || resource.data.reportedBy == request.auth.uid);
      allow update, delete: if isAdmin();
    }

    // ✅ Événements — ny mpamorona manova/mamafa ; ny rehetra RSVP
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.createdBy == request.auth.uid;
      allow update: if request.auth != null && (
        isAdmin() ||
        resource.data.createdBy == request.auth.uid ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['attendees', 'interested'])
      );
      allow delete: if request.auth != null && (isAdmin() || resource.data.createdBy == request.auth.uid);
    }

    // ✅ Petites annonces — ny mpamorona ihany no manova/mamafa
    match /announcements/{annId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow update, delete: if request.auth != null && (isAdmin() || resource.data.uid == request.auth.uid);
    }

    // Posts — lecture par tous ; boost réservé à l'ADMIN
    // ✅ isBoosted/boostUntil : écriture par l'admin uniquement
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && !('isBoosted' in request.resource.data)
        && request.resource.data.content is string
        && request.resource.data.content.size() <= 2000;
      allow update: if request.auth != null &&
        (
          // 🔑 Admin : tout (boost inclus)
          isAdmin()
          ||
          // Owner : édite le contenu (pas les champs boost)
          (resource.data.uid == request.auth.uid
            && !request.resource.data.diff(resource.data).affectedKeys()
                .hasAny(['isBoosted', 'boostUntil', 'boostDays', 'boostedAt', 'uid']))
          ||
          // Tous : réactions et commentaires uniquement
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reactions', 'comments'])
        );
      allow delete: if request.auth != null && (isAdmin() || resource.data.uid == request.auth.uid);
    }

    // 📢 Annonces (pub in-feed) — lecture par tous, gestion par l'admin ;
    //    incrément clics/impressions autorisé à tous les connectés.
    match /ads/{adId} {
      allow read: if request.auth != null;
      allow create, delete: if isAdmin();
      allow update: if isAdmin()
        || (request.auth != null
            && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['clicks', 'impressions']));
    }

    // Commandes de boost (client -> admin valide/refuse)
    match /boostOrders/{orderId} {
      allow read: if request.auth != null && (isAdmin() || resource.data.requesterUid == request.auth.uid);
      allow create: if request.auth != null && request.resource.data.requesterUid == request.auth.uid;
      allow update, delete: if isAdmin();
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
      ".read": "auth != null",
      "$chatId": {
        ".write": "auth != null && ($chatId.contains(auth.uid) || $chatId.beginsWith('group_'))",
        "messages": {
          "$msgId": {
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
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 50 * 1024 * 1024
        && (request.resource.contentType.matches('image/.*') || request.resource.contentType.matches('video/.*'));
    }
    match /avatars/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
*/
