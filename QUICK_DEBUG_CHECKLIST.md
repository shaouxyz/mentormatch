# Quick Debug Checklist - Profile Update Error

## Step 1: Reload the App 🔄

**IMPORTANT**: The enhanced logging code was just added. You need to reload the app to see it.

### Option A: Reload in Expo Go
1. Shake your phone (or press Ctrl+M on Android emulator)
2. Tap "Reload"

### Option B: Press 'r' in Terminal
1. Go to the terminal where Expo is running
2. Press `r` to reload

### Option C: Restart Expo
```bash
# In terminal 2, press Ctrl+C to stop
# Then run:
npm run start:clear
```

## Step 2: Try Updating Profile Again 📝

1. Open the app
2. Go to **Profile** tab
3. Tap **"Edit Profile"**
4. Change something (e.g., your name)
5. Tap **"Save Changes"**

## Step 3: Check Terminal Logs 🔍

**Look for these new detailed logs** (they won't appear without reloading):

### ✅ If Working:
```
LOG  [INFO] Profile updated locally {"email": "your@email.com"}
LOG  [INFO] Profile updated in local allProfiles {"email": "your@email.com"}
LOG  [INFO] Firebase auth status for update {
  "isAuthenticated": true,
  "uid": "abc123...",
  "email": "your@email.com",
  "profileEmail": "your@email.com"
}
LOG  [INFO] Profile update synced to Firebase {"email": "your@email.com"}
```

### ❌ If Not Authenticated:
```
LOG  [INFO] Firebase auth status for update {
  "isAuthenticated": false,
  "uid": null,
  "email": null,
  "profileEmail": "your@email.com"
}
WARN  [WARN] User not authenticated in Firebase, skipping update sync
```

**This means**: You're not signed in with Firebase Auth.

**Fix**: 
- Log out and log back in
- Make sure you're using Firebase auth (not just local)

### ❌ If Permission Denied:
```
ERROR [ERROR] Error updating profile in Firestore {"error": "Missing or insufficient permissions."}
WARN  [WARN] Failed to sync profile update to Firebase {
  "email": "your@email.com",
  "error": "Missing or insufficient permissions.",
  "errorName": "FirebaseError"
}
```

**This means**: Firestore rules issue.

**Possible causes**:
1. Rules not published correctly
2. Rules published but not taking effect yet (wait 1-2 minutes)
3. User email in Firebase doesn't match profile email

## Step 4: Verify Firebase Rules ⚙️

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Go to **Firestore Database** → **Rules** tab
4. Check "Last updated" timestamp (should be recent)
5. Verify the rules include:

```javascript
// Profiles collection
match /profiles/{email} {
  // Anyone can read all profiles (for discovery feature)
  allow read: if true;
  
  // Only authenticated users can create their own profile
  allow create: if isSignedIn() && isOwner(email);
  
  // Only profile owner can update or delete their profile
  allow update, delete: if isSignedIn() && isOwner(email);
}
```

## Step 5: Check Authentication Status 🔐

The new logs will tell you if you're authenticated. If not:

### Re-authenticate:
1. **Log out** from the app
2. **Log back in** with your email and password
3. This ensures Firebase Auth is active
4. Try updating profile again

## Common Issues & Solutions

### Issue 1: "Old logs, no new detailed logs"
**Cause**: App not reloaded after code changes.
**Fix**: Reload the app (see Step 1).

### Issue 2: "isAuthenticated: false"
**Cause**: Not signed in with Firebase Auth.
**Fix**: Log out and log back in.

### Issue 3: "Permission denied even after rules update"
**Cause**: Rules might take a minute to propagate.
**Fix**: Wait 1-2 minutes, then try again.

### Issue 4: "Email mismatch"
**Cause**: Firebase user email ≠ profile email.
**Fix**: Check logs for both emails, ensure they match.

## What Error Are You Seeing?

Please check and let me know:

1. **Did you reload the app?** (Required to see new logs)
2. **What does the terminal show?** (Copy the exact error)
3. **What does `isAuthenticated` show?** (true or false?)
4. **What does the app show?** (Alert message?)

## Quick Commands

### Reload App
Press `r` in the Expo terminal

### View Latest Logs
```bash
Get-Content "c:\Users\Chunlin Wang\.cursor\projects\c-Proj-cmn\terminals\2.txt" -Tail 30
```

### Check Firebase Rules Timestamp
Go to Firebase Console → Firestore → Rules → Check "Last updated"

## Expected Timeline

1. ✅ Rules published: **Done**
2. ⏳ Rules propagate: **1-2 minutes**
3. 🔄 App reloaded: **Need to do this**
4. 🔐 User authenticated: **Check logs**
5. ✅ Profile updates: **Should work**

## Next Step

**Please reload the app first**, then try updating your profile and share:
- The exact error message
- The terminal logs (especially the "Firebase auth status for update" line)
- Whether you see the new detailed logs or old logs
