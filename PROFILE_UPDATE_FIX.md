# Profile Update Error Fix

## Issue
When updating a profile, you're seeing this error:
```
ERROR [ERROR] Error updating profile in Firestore {"error": "Missing or insufficient permissions."}
```

## Root Cause
Same as profile creation - Firestore security rules are blocking write operations.

## Fix Applied

### Enhanced Debug Logging for Profile Updates

Updated `services/hybridProfileService.ts` to add the same detailed logging for `hybridUpdateProfile()` that was added for `hybridCreateProfile()`.

**Now logs**:
```typescript
LOG  [INFO] Firebase auth status for update {
  "isAuthenticated": true,
  "uid": "abc123...",
  "email": "user@example.com",
  "profileEmail": "user@example.com"
}
```

**Warnings added**:
- User not authenticated in Firebase during update
- Firebase user email doesn't match profile email
- Detailed error information (name, message)

## Solution

### Same as Profile Creation

The fix is identical to the profile creation issue:

1. **Update Firestore Security Rules** in Firebase Console
2. **Restart the app** (`npm run start:clear`)
3. **Test profile update**

See `FIRESTORE_PERMISSIONS_FIX.md` for detailed instructions.

### Security Rules Reminder

The rules allow profile updates only if:
```javascript
// Only profile owner can update or delete their profile
allow update, delete: if isSignedIn() && isOwner(email);
```

This means:
- ✅ User must be signed in to Firebase Auth
- ✅ User can only update their own profile (email matches)
- ❌ Cannot update other users' profiles

## Testing Profile Update

### Step 1: Sign In
Make sure you're signed in with Firebase Auth (not just local auth).

### Step 2: Edit Profile
1. Go to Profile tab
2. Click "Edit Profile"
3. Change any field (name, expertise, etc.)
4. Click "Save"

### Step 3: Check Logs

**✅ Success**:
```
LOG  [INFO] Profile updated locally {"email": "user@example.com"}
LOG  [INFO] Profile updated in local allProfiles {"email": "user@example.com"}
LOG  [INFO] Firebase auth status for update {"isAuthenticated": true, "uid": "...", "email": "user@example.com", "profileEmail": "user@example.com"}
LOG  [INFO] Profile update synced to Firebase {"email": "user@example.com"}
```

**❌ Not Authenticated**:
```
LOG  [INFO] Firebase auth status for update {"isAuthenticated": false, "uid": null, "email": null, "profileEmail": "user@example.com"}
WARN  [WARN] User not authenticated in Firebase, skipping update sync {"email": "user@example.com", "hint": "Make sure user is signed in with Firebase Auth before updating profile"}
```

**❌ Permission Denied** (before fixing rules):
```
ERROR [ERROR] Error updating profile in Firestore {"error": "Missing or insufficient permissions."}
WARN  [WARN] Failed to sync profile update to Firebase, continuing with local only {"email": "user@example.com", "error": "Missing or insufficient permissions.", "errorName": "FirebaseError"}
```

### Step 4: Verify in Firebase Console

1. Go to Firebase Console → Firestore Database → Data
2. Open the `profiles` collection
3. Find your profile document (ID = your email)
4. Check that the fields are updated
5. Check that `updatedAt` timestamp is recent

## Common Issues

### Issue 1: Profile Updates Locally But Not in Firebase

**Symptoms**:
- Profile changes appear in the app
- But don't show up in Firebase Console
- See warning: "Failed to sync profile update to Firebase"

**Causes**:
1. User not authenticated in Firebase
2. Firestore security rules not updated
3. Firebase not configured (no `.env` file)

**Fix**:
- Check logs for auth status
- Update Firestore security rules
- Verify `.env` file exists and is correct

### Issue 2: "Email Mismatch" Warning

**Symptoms**:
```
WARN  [WARN] Firebase user email does not match profile email for update
```

**Cause**: Trying to update a profile that doesn't belong to the currently authenticated user.

**Fix**: This shouldn't happen in normal flow. Check that:
- User is editing their own profile
- Not trying to edit another user's profile
- Email hasn't changed during the session

### Issue 3: Update Works for Some Fields But Not Others

**Cause**: This is likely a Firestore schema issue, not a permissions issue.

**Fix**: Check that all fields in the profile match the Firestore schema.

## Differences Between Create and Update

### Create (`setDoc`)
- Creates a new document
- Overwrites if document already exists
- Requires `allow create` permission

### Update (`updateDoc`)
- Updates existing document
- Fails if document doesn't exist
- Requires `allow update` permission

### Security Rules
Both operations require:
- User to be authenticated
- User to own the profile (email matches)

## Next Steps

1. ✅ Update Firestore security rules (if not done already)
2. ✅ Restart the app (`npm run start:clear`)
3. ✅ Test profile creation (sign up + create profile)
4. ✅ Test profile update (edit profile)
5. ✅ Verify both operations in Firebase Console

## Related Files

- `services/hybridProfileService.ts` - Updated with enhanced logging
- `services/firebaseProfileService.ts` - Firestore operations
- `app/profile/edit.tsx` - Profile edit screen
- `FIRESTORE_PERMISSIONS_FIX.md` - Detailed troubleshooting
- `FIRESTORE_DEBUG_SUMMARY.md` - Overview of all changes

## Summary

The profile update error has the **same root cause** as the profile creation error:
- ❌ Firestore security rules blocking writes
- ❌ User not authenticated in Firebase

The **same fix** applies:
- ✅ Update Firestore security rules in Firebase Console
- ✅ Ensure user is signed in with Firebase Auth

**Enhanced logging** now helps diagnose update issues just like create issues.
