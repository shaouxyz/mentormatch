# Diagnose Missing Profile in Firestore

## Problem

User `shaouxyz@gmail.com` exists in Firebase Authentication but doesn't have a profile in Firestore database.

## Root Cause Analysis

### Signup Flow:
1. ✅ User signs up → `hybridSignUp()` → Creates user in Firebase Auth
2. ✅ User redirected to `/profile/create`
3. ⚠️ User creates profile → `hybridCreateProfile()` → Checks Firebase Auth state
4. ❌ **Issue**: If Firebase Auth state isn't loaded yet, `getCurrentFirebaseUser()` returns `null`
5. ❌ Profile saved locally but NOT synced to Firestore

### The Problem in Code:

In `services/hybridProfileService.ts`:
```typescript
const currentUser = getCurrentFirebaseUser();
if (!currentUser) {
  logger.warn('User not authenticated in Firebase, skipping sync');
  // Profile saved locally but NOT in Firestore ❌
}
```

## Why Firebase Auth State Might Be Null

1. **Timing Issue**: Firebase Auth state might not be loaded immediately after signup
2. **AsyncStorage Persistence**: Firebase Auth uses AsyncStorage for persistence, which might not be ready
3. **App State**: If app was backgrounded/foregrounded, Auth state might be lost

## Solutions

### Solution 1: Auto-Sync on Login (Implemented)

When user logs in, the app now:
1. Checks if profile exists in Firestore
2. If not, checks local storage
3. If local profile exists, attempts to sync it to Firestore
4. Uses the synced profile or falls back to local

**File**: `app/login.tsx` - Updated to auto-sync profiles on login

### Solution 2: Manual Sync Script

Created utility function: `scripts/syncProfileToFirestore.ts`

This can be called programmatically to sync a profile.

### Solution 3: User Action (Recommended for Current Issue)

**For `shaouxyz@gmail.com`:**

1. **Log in to the app** with `shaouxyz@gmail.com`
2. The app will automatically detect the missing Firestore profile
3. It will attempt to sync the local profile to Firestore
4. Check logs for:
   ```
   [INFO] Found local profile but not in Firestore, attempting to sync
   [INFO] Profile synced to Firestore successfully
   ```

### Solution 4: Manual Creation in Firebase Console

1. Go to Firebase Console > Firestore Database
2. Navigate to `profiles` collection
3. Add document with ID: `shaouxyz@gmail.com`
4. Add fields from local storage (if available)

## Verification

### Check Firebase Auth:
```bash
# In Firebase Console
Authentication > Users > Search: shaouxyz@gmail.com
✅ Should see the user
```

### Check Firestore:
```bash
# In Firebase Console
Firestore Database > Data > profiles collection
❌ Document shaouxyz@gmail.com doesn't exist (before fix)
✅ Document shaouxyz@gmail.com exists (after fix)
```

### Check Local Storage:
The profile might exist in AsyncStorage. Check app logs for:
```
[INFO] Profile saved locally
[WARN] User not authenticated in Firebase, skipping sync
```

## Prevention

The fix in `app/login.tsx` will prevent this issue for future users:
- On login, if local profile exists but Firestore profile doesn't, it auto-syncs
- This ensures profiles are always synced when user is authenticated

## Related Files

- `app/login.tsx` - Auto-sync logic added
- `services/hybridProfileService.ts` - Profile creation logic
- `services/firebaseProfileService.ts` - Firestore operations
- `scripts/syncProfileToFirestore.ts` - Manual sync utility

## Next Steps

1. ✅ Code updated to auto-sync on login
2. ⏭️ User `shaouxyz@gmail.com` should log in to trigger auto-sync
3. ⏭️ Verify profile appears in Firestore after login
4. ⏭️ Test that profile loads correctly in app
