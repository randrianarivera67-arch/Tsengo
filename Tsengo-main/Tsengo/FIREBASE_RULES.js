// =============================================
// FIREBASE FIRESTORE RULES
// Asiana ao amin'ny Firebase Console > Firestore > Rules
// =============================================

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users - afaka mamaky ny rehetra, afaka manova ny anazy ihany
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Posts - afaka mamaky ny rehetra, afaka manoratra raha authenticated
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        (resource.data.uid == request.auth.uid || request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reactions', 'comments']));
    }

    // Notifications
    match /notifications/{notifId} {
      allow read: if request.auth != null && resource.data.toUid == request.auth.uid;
      allow create: if request.auth != null;
      allow update: if request.auth != null && resource.data.toUid == request.auth.uid;
      allow delete: if request.auth != null && resource.data.toUid == request.auth.uid;
    }

    // Friend requests
    match /friendRequests/{reqId} {
      allow read: if request.auth != null &&
        (resource.data.fromUid == request.auth.uid || resource.data.toUid == request.auth.uid);
      allow create: if request.auth != null;
      allow update: if request.auth != null && resource.data.toUid == request.auth.uid;
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
            ".validate": "newData.hasChildren(['fromUid', 'toUid', 'text', 'ts'])"
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
      allow write: if request.auth != null && request.auth.uid == userId
        && request.resource.size < 50 * 1024 * 1024; // 50MB max
    }
    match /avatars/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024; // 5MB max
        && request.resource.contentType.matches('image/.*');
    }
  }
}
*/
