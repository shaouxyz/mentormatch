# APK Profile Load Tests

## Overview

This document describes the tests written for the Firebase profile sync functionality that was implemented to fix the issue where profiles were not showing in EAS builds.

## Problem

The EAS build of the app was not showing profiles for users (e.g., `shaouxyz@hotmail.com`) because:
1. The app was only loading profiles from local `AsyncStorage`
2. Firebase was not being initialized at app startup
3. Profiles were not being synced from Firestore

## Solution

The following changes were made:
1. **`app/index.tsx`**: Added Firebase initialization at app startup
2. **`app/(tabs)/home.tsx`**: Updated to use `hybridGetProfile()` and `hybridGetAllProfiles()` to sync from Firebase
3. **`app/login.tsx`**: Already using `hybridGetProfile()` to load profiles from Firebase

## Tests Written

### Home Screen Tests (`app/__tests__/home.test.tsx`)

Added 6 new tests in the "Firebase sync functionality" describe block:

1. **`should initialize Firebase when loading profiles`**
   - Verifies that `initializeFirebase()` is called when the home screen loads profiles
   - Ensures Firebase is initialized before attempting to sync data

2. **`should load current user profile from Firebase using hybridGetProfile`**
   - Tests that the current user's profile is loaded from Firebase using `hybridGetProfile()`
   - Verifies the profile is saved to local storage after being loaded from Firebase
   - Ensures the profile is available even if it wasn't previously in local storage

3. **`should fallback to local storage if hybridGetProfile fails`**
   - Tests graceful degradation when Firebase is unavailable
   - Verifies that the app continues to work using local storage when Firebase fails
   - Ensures the UI still renders correctly

4. **`should sync all profiles from Firebase using hybridGetAllProfiles`**
   - Tests that all profiles are synced from Firebase using `hybridGetAllProfiles()`
   - Verifies synced profiles are saved to local storage
   - Ensures profiles from Firebase are available in the app

5. **`should fallback to local storage if hybridGetAllProfiles fails`**
   - Tests graceful degradation when syncing all profiles fails
   - Verifies the app continues to work with local profiles
   - Ensures the UI still renders correctly

6. **`should merge Firebase and local profiles`**
   - Tests that profiles from both Firebase and local storage are merged
   - Verifies no duplicate profiles are created
   - Ensures all profiles are available regardless of source

### Login Screen Tests (`app/__tests__/login.test.tsx`)

Added 2 new tests in the "Firebase profile sync on login" describe block:

1. **`should save profile to allProfiles when loaded from Firebase`**
   - Tests that when a profile is loaded from Firebase during login, it's added to `allProfiles`
   - Verifies the profile is saved locally for offline access
   - Ensures the profile is available in the home screen after login

2. **`should handle Firebase sync failure gracefully and use local profile`**
   - Tests that login still works when Firebase is unavailable
   - Verifies the app uses local profile if Firebase fails
   - Ensures navigation still occurs correctly

## Test Results

All tests pass:
- **Home Screen**: 22 tests passing (16 existing + 6 new)
- **Login Screen**: 17 tests passing (15 existing + 2 new)
- **Total**: 379 tests passing across all test suites

## Test Coverage

The tests cover:
- ✅ Firebase initialization
- ✅ Profile loading from Firebase
- ✅ Profile syncing from Firebase
- ✅ Graceful degradation when Firebase fails
- ✅ Local storage fallback
- ✅ Profile merging from multiple sources
- ✅ Profile persistence to local storage

## Running the Tests

To run all tests:
```bash
npm test
```

To run only the Firebase sync tests:
```bash
npm test -- app/__tests__/home.test.tsx --testNamePattern="Firebase"
npm test -- app/__tests__/login.test.tsx --testNamePattern="Firebase"
```

## Implementation Details

### Mocks Used

1. **`@/config/firebase.config`**: Mocked `initializeFirebase()` and `isFirebaseConfigured()`
2. **`@/services/hybridProfileService`**: Uses existing mocks from `jest.setup.js`, but can be overridden in tests

### Test Data

Tests use mock profiles with the following structure:
```typescript
{
  name: string;
  expertise: string;
  interest: string;
  expertiseYears: number;
  interestYears: number;
  email: string;
  phoneNumber: string;
}
```

## Related Files

- `app/(tabs)/home.tsx` - Home screen implementation
- `app/login.tsx` - Login screen implementation
- `app/index.tsx` - App entry point with Firebase initialization
- `services/hybridProfileService.ts` - Hybrid profile service
- `config/firebase.config.ts` - Firebase configuration

## Next Steps

1. ✅ Tests written and passing
2. ✅ All test suites passing (379/379)
3. ⏭️ Ready for EAS build verification

After setting EAS secrets (see `FIREBASE_ENV_STATUS.md`), rebuild the app and verify profiles load correctly on a physical device.
