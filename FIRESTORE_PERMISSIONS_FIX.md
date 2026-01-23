# Firestore Permissions Fix

## Issue
When creating a profile, you're seeing this error:
```
ERROR [ERROR] Error creating profile in Firestore {"error": "Missing or insufficient permissions."}
```

This happens because Firestore security rules are blocking write operations.

## Root Causes

### 1. Firestore Security Rules Not Configured
By default, Firestore either:
- Starts in "test mode" (allows all reads/writes for 30 days, then blocks everything)
- Starts in "locked mode" (blocks all reads/writes immediately)

### 2. User Not Authenticated in Firebase
The security rules require authentication, but the user might not be signed in to Firebase Auth.

## Solutions

### Solution 1: Update Firestore Security Rules (Recommended)

#### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** → **Rules** tab

#### Step 2: Check Current Rules
You'll see something like:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;  // ❌ This blocks everything
    }
  }
}
```

#### Step 3: Update to Proper Rules
Replace with these production-ready rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userEmail) {
      return request.auth.token.email == userEmail;
    }
    
    // Profiles collection
    match /profiles/{email} {
      // Anyone can read all profiles (for discovery feature)
      allow read: if true;
      
      // Only authenticated users can create their own profile
      allow create: if isSignedIn() && isOwner(email);
      
      // Only profile owner can update or delete their profile
      allow update, delete: if isSignedIn() && isOwner(email);
    }
    
    // Mentorship requests collection
    match /mentorshipRequests/{requestId} {
      // Users can read requests where they are either sender or receiver
      allow read: if isSignedIn() && (
        resource.data.requesterEmail == request.auth.token.email ||
        resource.data.mentorEmail == request.auth.token.email
      );
      
      // Authenticated users can create requests (as requester)
      allow create: if isSignedIn() && 
        request.resource.data.requesterEmail == request.auth.token.email;
      
      // Only mentor can update request (to accept/decline)
      allow update: if isSignedIn() && 
        resource.data.mentorEmail == request.auth.token.email;
      
      // Only requester can delete pending requests
      allow delete: if isSignedIn() && 
        resource.data.requesterEmail == request.auth.token.email &&
        resource.data.status == 'pending';
    }
  }
}
```

#### Step 4: Publish Rules
1. Click **"Publish"** button
2. Wait for confirmation message

### Solution 2: Temporary Development Rules (For Testing Only)

⚠️ **WARNING**: Only use this for local development/testing. Never use in production!

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // ⚠️ Allows all access - DEVELOPMENT ONLY
    }
  }
}
```

## Verify the Fix

### 1. Check Logs
After updating rules, restart the app and check for:
```
LOG  [INFO] Profile created in Firestore {"email": "user@example.com"}
LOG  [INFO] Profile synced to Firebase {"email": "user@example.com"}
```

### 2. Check Firebase Console
1. Go to **Firestore Database** → **Data** tab
2. You should see a `profiles` collection
3. Click on it to see your profile document

### 3. Test Profile Creation
1. Sign up with a new account
2. Create a profile
3. Check that no "Missing or insufficient permissions" error appears

## Additional Fixes Applied

### Firebase Auth Persistence
Updated `config/firebase.config.ts` to use AsyncStorage for auth persistence:
```typescript
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
```

This ensures:
- Users stay logged in between app sessions
- No more warning about "Auth state will default to memory persistence"

## Understanding the Security Rules

### Profile Rules Explained
```javascript
// Anyone can read all profiles (for discovery feature)
allow read: if true;
```
- Allows all users to browse profiles on the home screen
- No authentication required for reading

```javascript
// Only authenticated users can create their own profile
allow create: if isSignedIn() && isOwner(email);
```
- User must be signed in to Firebase Auth
- Can only create a profile with their own email as the document ID

```javascript
// Only profile owner can update or delete their profile
allow update, delete: if isSignedIn() && isOwner(email);
```
- User must be signed in
- Can only modify their own profile

### Request Rules Explained
```javascript
allow read: if isSignedIn() && (
  resource.data.requesterEmail == request.auth.token.email ||
  resource.data.mentorEmail == request.auth.token.email
);
```
- Users can only see requests they're involved in (as sender or receiver)
- Prevents users from seeing other people's requests

## Troubleshooting

### Still Getting Permission Errors?

#### Check 1: Verify Rules Are Published
- Go to Firebase Console → Firestore → Rules
- Check the "Last updated" timestamp
- Make sure it's recent

#### Check 2: Verify User Is Authenticated
Add this debug log to `services/hybridProfileService.ts`:
```typescript
import { getCurrentFirebaseUser } from './firebaseAuthService';

export async function hybridCreateProfile(profile: Profile): Promise<void> {
  // ... existing code ...
  
  if (isFirebaseConfigured()) {
    try {
      const currentUser = await getCurrentFirebaseUser();
      logger.info('Current Firebase user', { 
        uid: currentUser?.uid, 
        email: currentUser?.email 
      });
      
      await createFirebaseProfile(profile);
      // ... rest of code ...
    }
  }
}
```

If `currentUser` is `null`, the user isn't signed in to Firebase Auth.

#### Check 3: Verify Firebase Config
Make sure your `.env` file has valid Firebase credentials:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

Restart Expo after updating `.env`:
```bash
npm run start:clear
```

## Next Steps

1. ✅ Update Firestore security rules in Firebase Console
2. ✅ Verify rules are published
3. ✅ Restart the app (`npm run start:clear`)
4. ✅ Test profile creation
5. ✅ Check Firebase Console for new profile documents

## Related Documentation
- [Firebase Setup Guide](docs/FIREBASE_SETUP_GUIDE.md)
- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
