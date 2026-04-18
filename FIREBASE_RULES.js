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
      allow update: if request.auth != null && request.auth.uid == userId
        && !request.resource.data.diff(resource.data).affectedKeys()
            .hasAny(['isAdmin', 'isVip', 'uid', 'email']);
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
      "$chatId": {
        ".read": "auth != null && ($chatId.contains(auth.uid))",
        ".write": "auth != null && ($chatId.contains(auth.uid))",
        "messages": {
          "$msgId": {
            ".validate": "newData.hasChildren(['fromUid', 'toUid', 'text', 'ts'])
              && newData.child('fromUid').val() === auth.uid
              && newData.child('text').isString()
              && newData.child('text').val().length <= 2000"
          }
        }
      }
    },
    "online": {
      "$uid": {
        ".read": "auth != null",
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
