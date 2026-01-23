# Firestore Connection Debug & Fix Summary

## Issues Identified

### 1. ❌ Missing or Insufficient Permissions
**Error**: `FirebaseError: Missing or insufficient permissions.`

**Cause**: Firestore security rules are blocking write operations.

**Status**: ⚠️ **Requires manual fix in Firebase Console**

### 2. ⚠️ Firebase Auth Not Persisting
**Warning**: `Auth state will default to memory persistence and will not persist between sessions`

**Cause**: Firebase Auth wasn't configured to use AsyncStorage for React Native.

**Status**: ✅ **FIXED** - Updated `config/firebase.config.ts`

### 3. 🔍 Insufficient Debug Logging
**Issue**: Hard to diagnose why Firebase sync fails.

**Status**: ✅ **FIXED** - Enhanced logging in `services/hybridProfileService.ts`

## Changes Made

### 1. Fixed Firebase Auth Persistence (`config/firebase.config.ts`)

**Before**:
```typescript
auth = getAuth(app);
```

**After**:
```typescript
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
```

**Benefits**:
- Users stay logged in between app sessions
- Auth state persists across app restarts
- No more warning about memory-only persistence

### 2. Enhanced Debug Logging (`services/hybridProfileService.ts`)

Added detailed authentication status logging for both **create** and **update** operations:
```typescript
const currentUser = getCurrentFirebaseUser();
logger.info('Firebase auth status', { 
  isAuthenticated: !!currentUser,
  uid: currentUser?.uid,
  email: currentUser?.email,
  profileEmail: profile.email
});
```

**New warnings for common issues**:
- User not authenticated in Firebase
- Firebase user email doesn't match profile email
- Detailed error information (error name, message)

**Applied to**:
- `hybridCreateProfile()` - When creating a new profile
- `hybridUpdateProfile()` - When updating an existing profile

### 3. Created Documentation

- **`FIRESTORE_PERMISSIONS_FIX.md`**: Step-by-step guide to fix permissions
- **`FIRESTORE_DEBUG_SUMMARY.md`**: This file - overview of all changes

## What You Need to Do

### Step 1: Update Firestore Security Rules ⚠️ REQUIRED

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules** tab
4. Replace existing rules with:

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

5. Click **"Publish"**

### Step 2: Restart the App

```bash
npm run start:clear
```

This ensures:
- New Firebase config is loaded
- Metro bundler cache is cleared
- Fresh connection to Firebase

### Step 3: Test Profile Creation

1. **Sign up** with a new account (or sign in with existing)
2. **Create a profile**
3. **Check the logs** for these messages:

**✅ Success indicators**:
```
LOG  [INFO] Firebase auth status {"isAuthenticated": true, "uid": "...", "email": "user@example.com"}
LOG  [INFO] Profile synced to Firebase {"email": "user@example.com"}
```

**❌ Still failing?** See troubleshooting section below.

### Step 4: Verify in Firebase Console

1. Go to **Firestore Database** → **Data** tab
2. Look for `profiles` collection
3. You should see your profile document with your email as the ID

## Understanding the Logs

### Successful Firebase Sync
```
LOG  [INFO] Profile saved locally {"email": "user@example.com"}
LOG  [INFO] Profile added to local allProfiles {"email": "user@example.com"}
LOG  [INFO] Firebase initialized successfully
LOG  [INFO] Firebase auth status {"isAuthenticated": true, "uid": "abc123", "email": "user@example.com", "profileEmail": "user@example.com"}
LOG  [INFO] Profile synced to Firebase {"email": "user@example.com"}
```

### User Not Authenticated
```
LOG  [INFO] Firebase auth status {"isAuthenticated": false, "uid": null, "email": null, "profileEmail": "user@example.com"}
WARN  [WARN] User not authenticated in Firebase, skipping sync {"email": "user@example.com", "hint": "Make sure to sign up/sign in with Firebase Auth before creating profile"}
```

**Fix**: Make sure you're using the signup/login flow that calls Firebase Auth.

### Permission Denied (Before Fix)
```
ERROR [ERROR] Error creating profile in Firestore {"error": "Missing or insufficient permissions."}
WARN  [WARN] Failed to sync profile to Firebase, continuing with local only {"email": "user@example.com", "error": "Missing or insufficient permissions."}
```

**Fix**: Update Firestore security rules (Step 1 above).

### Email Mismatch
```
WARN  [WARN] Firebase user email does not match profile email {"firebaseEmail": "user1@example.com", "profileEmail": "user2@example.com"}
```

**Fix**: This shouldn't happen in normal flow. Check that you're creating a profile for the currently logged-in user.

## Troubleshooting

### Still Getting "Missing or insufficient permissions"?

**Check 1**: Verify rules are published
- Go to Firebase Console → Firestore → Rules
- Check "Last updated" timestamp
- Should be recent (within last few minutes)

**Check 2**: Verify user is authenticated
- Look for log: `Firebase auth status {"isAuthenticated": true}`
- If `false`, user isn't signed in to Firebase Auth

**Check 3**: Check Firebase config
- Verify `.env` file has correct values
- Restart Expo after updating `.env`

**Check 4**: Test with development rules (temporary)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // ⚠️ DEVELOPMENT ONLY
    }
  }
}
```

If this works, the issue is with the production rules logic.

### User Not Authenticated in Firebase?

**Possible causes**:
1. **Using local-only auth**: The app has both local (AsyncStorage) and Firebase auth. Make sure Firebase auth is being called.
2. **Auth state not loaded yet**: Firebase auth might still be initializing.
3. **Auth persistence issue**: Should be fixed by the changes made, but restart the app to be sure.

**Solution**: Check `app/signup.tsx` and ensure it's calling `hybridSignUp` which includes Firebase auth.

### Profile Saves Locally But Not to Firebase?

This is **expected behavior** if:
- Firebase is not configured (`.env` not set up)
- User is not authenticated in Firebase
- Firestore rules block the write

The app is designed to work offline-first:
- ✅ Profile always saves locally
- ✅ App continues to work
- ⚠️ Firebase sync fails gracefully with a warning

To enable Firebase sync:
1. Set up `.env` with Firebase config
2. Update Firestore security rules
3. Ensure user signs in with Firebase Auth

## Current App Behavior

### Hybrid Storage Strategy

The app uses a **hybrid local + cloud** approach:

1. **Always saves locally first** (AsyncStorage)
   - Ensures offline functionality
   - Fast, reliable
   
2. **Attempts to sync to Firebase** (if configured)
   - Enables cloud backup
   - Syncs across devices
   - Real-time updates

3. **Graceful degradation**
   - If Firebase fails, app continues with local storage
   - User sees warning in logs but no error in UI
   - Profile is still usable

### Why This Approach?

- ✅ Works offline
- ✅ Works without Firebase (for development/testing)
- ✅ Seamlessly upgrades to cloud when Firebase is configured
- ✅ Resilient to network issues
- ✅ No user-facing errors if Firebase is down

## Next Steps

1. ✅ **Update Firestore security rules** (see Step 1 above)
2. ✅ **Restart the app** (`npm run start:clear`)
3. ✅ **Test profile creation**
4. ✅ **Verify in Firebase Console**
5. ✅ **Check logs for success messages**

## Related Files

- `config/firebase.config.ts` - Firebase initialization (updated)
- `services/hybridProfileService.ts` - Profile sync logic (updated)
- `services/firebaseProfileService.ts` - Firestore operations
- `services/firebaseAuthService.ts` - Firebase Auth operations
- `FIRESTORE_PERMISSIONS_FIX.md` - Detailed troubleshooting guide
- `docs/FIREBASE_SETUP_GUIDE.md` - Complete Firebase setup guide

## Support

If you're still experiencing issues after following this guide:

1. Check the app logs for the specific error message
2. Verify all steps in `FIRESTORE_PERMISSIONS_FIX.md`
3. Review `docs/FIREBASE_SETUP_GUIDE.md` for complete setup
4. Check Firebase Console for any error messages or warnings
