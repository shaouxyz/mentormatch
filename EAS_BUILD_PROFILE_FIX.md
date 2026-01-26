# EAS Build Profile Not Showing Fix

## Issue
After installing the EAS build on a phone, the profile for `shaouxyz@hotmail.com` is not showing up.

## Root Cause
The home screen (`app/(tabs)/home.tsx`) was only loading profiles from local AsyncStorage and not syncing from Firebase. This meant:
1. If the profile exists in Firestore but not in local storage, it won't show
2. If the user logs in on a new device, profiles won't be synced from Firebase
3. The app wasn't using the hybrid profile service to sync from Firebase

## Fix Applied

### 1. Updated Home Screen to Sync from Firebase
- Modified `app/(tabs)/home.tsx` to use `hybridGetAllProfiles()` instead of just reading from AsyncStorage
- Added Firebase initialization in the `loadProfiles` function
- Added logic to sync current user's profile from Firebase using `hybridGetProfile()`
- Profiles are now synced from Firebase and saved locally for offline access

### 2. Added Firebase Initialization at App Startup
- Modified `app/index.tsx` to initialize Firebase when the app starts
- This ensures Firebase is ready before any profile operations

## Changes Made

### `app/(tabs)/home.tsx`
- Added imports: `hybridGetAllProfiles`, `hybridGetProfile`, `initializeFirebase`
- Updated `loadProfiles()` to:
  - Initialize Firebase if configured
  - Use `hybridGetProfile()` to load current user's profile (tries Firebase first, then local)
  - Use `hybridGetAllProfiles()` to sync all profiles from Firebase
  - Save synced profiles to local storage for offline access

### `app/index.tsx`
- Added Firebase initialization at app startup
- Firebase is initialized before other services

## How It Works Now

1. **App Startup**: Firebase is initialized when the app starts
2. **Login**: When user logs in, `hybridGetProfile()` is called which:
   - Tries to get profile from Firebase first
   - Falls back to local storage if Firebase fails
   - Saves profile to local storage for quick access
3. **Home Screen Load**: When home screen loads:
   - Initializes Firebase if not already initialized
   - Uses `hybridGetAllProfiles()` to sync profiles from Firebase
   - Merges Firebase profiles with local profiles
   - Saves synced profiles to local storage
   - Displays all profiles (excluding current user)

## Verification Steps

1. **Check Firebase Configuration**:
   - Ensure environment variables are set in EAS build:
     - `EXPO_PUBLIC_FIREBASE_API_KEY`
     - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
     - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
     - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
     - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
     - `EXPO_PUBLIC_FIREBASE_APP_ID`

2. **Check Firestore**:
   - Verify the profile exists in Firestore for `shaouxyz@hotmail.com`
   - Check the `profiles` collection in Firebase Console

3. **Check Logs**:
   - Look for Firebase initialization logs
   - Look for profile sync logs
   - Check for any Firebase errors

4. **Test Flow**:
   - Log in with `shaouxyz@hotmail.com`
   - Check if profile is loaded from Firebase
   - Navigate to home screen
   - Verify profile appears in the list

## Environment Variables for EAS Build

Make sure these are set in your `eas.json` or EAS secrets:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_FIREBASE_API_KEY": "your-api-key",
        "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "your-project.firebaseapp.com",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "your-project-id",
        "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET": "your-project.appspot.com",
        "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "your-sender-id",
        "EXPO_PUBLIC_FIREBASE_APP_ID": "your-app-id"
      }
    }
  }
}
```

Or use EAS secrets:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your-api-key"
# ... repeat for other variables
```

## Troubleshooting

If profile still doesn't show:

1. **Check Firebase Authentication**:
   - Ensure user is authenticated in Firebase
   - Check Firebase Console > Authentication > Users

2. **Check Firestore Permissions**:
   - Verify Firestore security rules allow reading profiles
   - Check if user has proper permissions

3. **Check Network**:
   - Ensure device has internet connection
   - Check if Firebase requests are being blocked

4. **Check Logs**:
   - Enable verbose logging
   - Look for Firebase errors in console/logs

5. **Manual Sync**:
   - Try pull-to-refresh on home screen
   - This will trigger `loadProfiles()` again

## Related Files
- `app/(tabs)/home.tsx` - Home screen with profile loading
- `app/index.tsx` - App entry point with Firebase initialization
- `services/hybridProfileService.ts` - Hybrid profile service
- `config/firebase.config.ts` - Firebase configuration
