# Check Missing Profile in Firestore

## Problem

User `shaouxyz@gmail.com` exists in Firebase Authentication but doesn't have a profile in Firestore database.

## Why This Happens

This can occur when:

1. **User signed up** → Firebase Auth account was created ✅
2. **Profile creation failed** → Profile wasn't synced to Firestore ❌

Common causes:
- Firebase Auth state wasn't loaded when profile was created
- Profile was created before Firebase was configured
- Profile creation failed silently (logged but didn't throw error)

## How to Check

### Option 1: Use the Diagnostic Script

```bash
# First, you need a Firebase Admin SDK service account key
# Download it from: Firebase Console > Project Settings > Service Accounts > Generate new private key
# Save it as serviceAccountKey.json in project root

npx ts-node scripts/checkAndFixMissingProfile.ts shaouxyz@gmail.com
```

### Option 2: Check Manually in Firebase Console

1. **Check Firebase Auth:**
   - Go to Firebase Console > Authentication > Users
   - Search for `shaouxyz@gmail.com`
   - ✅ Should see the user

2. **Check Firestore:**
   - Go to Firebase Console > Firestore Database > Data
   - Navigate to `profiles` collection
   - Search for document with ID `shaouxyz@gmail.com`
   - ❌ Document doesn't exist

## How to Fix

### Solution 1: User Logs In and Creates Profile (Recommended)

1. User logs in with `shaouxyz@gmail.com`
2. If no profile exists, user is redirected to profile creation
3. User creates profile → Should sync to Firestore automatically

**Check logs for:**
```
[INFO] User authenticated with Firebase {"email": "shaouxyz@gmail.com"}
[INFO] Firebase auth status {"isAuthenticated": true, "uid": "...", "email": "shaouxyz@gmail.com"}
[INFO] Profile synced to Firebase {"email": "shaouxyz@gmail.com"}
```

### Solution 2: Manual Profile Creation in Firestore

1. Go to Firebase Console > Firestore Database
2. Navigate to `profiles` collection
3. Click "Add document"
4. Document ID: `shaouxyz@gmail.com`
5. Add fields:
   ```json
   {
     "name": "User Name",
     "email": "shaouxyz@gmail.com",
     "expertise": "Expertise Area",
     "interest": "Interest Area",
     "expertiseYears": 0,
     "interestYears": 0,
     "phoneNumber": "+1234567890",
     "createdAt": "2026-01-26T00:00:00.000Z",
     "updatedAt": "2026-01-26T00:00:00.000Z"
   }
   ```

### Solution 3: Create Migration Script

If you have the profile data locally, you can create a script to migrate it:

```typescript
// scripts/migrateProfileToFirestore.ts
import { initializeFirebase } from '@/config/firebase.config';
import { createFirebaseProfile } from '@/services/firebaseProfileService';
import { getCurrentFirebaseUser } from '@/services/firebaseAuthService';

async function migrateProfile() {
  // Initialize Firebase
  initializeFirebase();
  
  // Sign in as the user (or use Admin SDK)
  // Then create the profile
  const profile = {
    name: 'User Name',
    email: 'shaouxyz@gmail.com',
    expertise: 'Expertise',
    interest: 'Interest',
    expertiseYears: 0,
    interestYears: 0,
    phoneNumber: '+1234567890',
  };
  
  await createFirebaseProfile(profile);
}
```

## Prevention

To prevent this in the future:

1. **Ensure Firebase Auth state is loaded** before creating profile
2. **Add retry logic** in profile creation
3. **Log errors** more prominently
4. **Add validation** to ensure profile exists after creation

## Code Flow

### Signup Flow:
1. `app/signup.tsx` → `hybridSignUp()` → Creates user in Firebase Auth ✅
2. Redirects to `/profile/create`
3. `app/profile/create.tsx` → `hybridCreateProfile()` → Should create profile in Firestore

### Login Flow:
1. `app/login.tsx` → `hybridSignIn()` → Authenticates with Firebase Auth ✅
2. `hybridGetProfile()` → Checks Firestore first, then local
3. If no profile found → Redirects to `/profile/create`

## Related Files

- `services/hybridAuthService.ts` - User signup/signin
- `services/hybridProfileService.ts` - Profile creation
- `services/firebaseProfileService.ts` - Firestore profile operations
- `app/signup.tsx` - Signup screen
- `app/profile/create.tsx` - Profile creation screen
