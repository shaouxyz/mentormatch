# Firebase Testing Steps

## ✅ Rules Updated Successfully!

You've successfully published the Firestore security rules. Now let's test that everything works.

## Next Steps

### Step 1: Wait for App to Start ⏳

The app is restarting with `npm run start:clear`. Wait for:
```
› Metro waiting on exp://192.168.1.105:8082
› Scan the QR code above with Expo Go
```

### Step 2: Open the App 📱

1. **Scan the QR code** with Expo Go (Android) or Camera app (iOS)
2. Wait for the app to load (should be faster now)

### Step 3: Test Profile Creation 🆕

If you **don't have a profile yet**:

1. **Sign up** with a new account (or sign in if you have one)
2. **Create a profile**:
   - Fill in Name
   - Add Expertise (e.g., "Machine Learning")
   - Add Interest (e.g., "Data Science")
   - Add Years of experience
   - Add Phone number
   - Add Location (e.g., "San Francisco, CA")
3. **Click Save**

**Watch the terminal logs** for:
```
LOG  [INFO] Profile saved locally {"email": "your@email.com"}
LOG  [INFO] Firebase auth status {"isAuthenticated": true, "uid": "...", "email": "your@email.com"}
LOG  [INFO] Profile synced to Firebase {"email": "your@email.com"}
```

✅ **Success!** If you see "Profile synced to Firebase", it worked!

### Step 4: Test Profile Update ✏️

1. **Go to Profile tab** (bottom navigation)
2. **Click "Edit Profile"** button
3. **Change something** (e.g., update your name or expertise)
4. **Click Save**

**Watch the terminal logs** for:
```
LOG  [INFO] Profile updated locally {"email": "your@email.com"}
LOG  [INFO] Firebase auth status for update {"isAuthenticated": true, "uid": "...", "email": "your@email.com"}
LOG  [INFO] Profile update synced to Firebase {"email": "your@email.com"}
```

✅ **Success!** If you see "Profile update synced to Firebase", it worked!

### Step 5: Verify in Firebase Console 🔍

1. **Open Firebase Console**: https://console.firebase.google.com/
2. **Go to Firestore Database** → **Data** tab
3. **Look for `profiles` collection**
4. **Click on it** - you should see your profile document
5. **Document ID** should be your email address
6. **Check the fields**:
   - `name`, `expertise`, `interest`, `expertiseYears`, `interestYears`
   - `phoneNumber`, `location`
   - `createdAt`, `updatedAt` timestamps

✅ **Success!** If you see your profile data, Firebase sync is working!

## What to Look For

### ✅ Success Indicators

**In Terminal Logs**:
- `Firebase initialized successfully`
- `Firebase auth status {"isAuthenticated": true}`
- `Profile synced to Firebase`
- `Profile update synced to Firebase`

**In Firebase Console**:
- `profiles` collection exists
- Your profile document is there (ID = your email)
- All fields are populated correctly
- Timestamps are recent

**In the App**:
- Profile saves without errors
- Profile updates without errors
- No error alerts shown to user

### ❌ Still Having Issues?

**If you see**:
```
WARN  [WARN] User not authenticated in Firebase, skipping sync
```

**This means**: You're not signed in with Firebase Auth.

**Fix**: 
- Make sure you signed up/logged in (not just using local auth)
- Check that `.env` file has correct Firebase credentials
- Restart the app

---

**If you see**:
```
ERROR [ERROR] Error creating profile in Firestore {"error": "Missing or insufficient permissions."}
```

**This means**: Rules might not be published correctly.

**Fix**:
1. Go back to Firebase Console → Firestore → Rules
2. Check "Last updated" timestamp (should be recent)
3. Verify the rules match the ones in `FIRESTORE_PERMISSIONS_FIX.md`
4. Click "Publish" again

---

**If you see**:
```
WARN  [WARN] Firebase user email does not match profile email
```

**This means**: Trying to create/update a profile for a different user.

**Fix**: This shouldn't happen in normal flow. Try logging out and back in.

## Testing Checklist

- [ ] App started successfully
- [ ] Signed up / Logged in
- [ ] Created profile (or already have one)
- [ ] Profile saved locally (log shows "Profile saved locally")
- [ ] Profile synced to Firebase (log shows "Profile synced to Firebase")
- [ ] Edited profile
- [ ] Update saved locally (log shows "Profile updated locally")
- [ ] Update synced to Firebase (log shows "Profile update synced to Firebase")
- [ ] Verified profile in Firebase Console
- [ ] All fields are correct in Firestore
- [ ] No error messages in terminal or app

## Additional Tests (Optional)

### Test Profile Discovery
1. **Go to Home tab**
2. **See other profiles** (including test accounts and CASPA members)
3. **Verify your profile appears** for other users

### Test Mentorship Requests
1. **Find a profile** on the Home tab
2. **Click "Send Request"**
3. **Add a note** and send
4. **Check terminal logs** for Firebase sync

### Test Offline Mode
1. **Turn off WiFi** on your phone
2. **Edit your profile**
3. **Profile should save locally** (log shows "Firebase not configured" or sync fails)
4. **Turn WiFi back on**
5. **Edit profile again** - should sync to Firebase

## Success Criteria

✅ **You're done when**:
1. Profile creates successfully and syncs to Firebase
2. Profile updates successfully and syncs to Firebase
3. You can see your profile in Firebase Console
4. No permission errors in the logs
5. App works smoothly without crashes

## Next Steps After Testing

Once everything is working:

1. ✅ **Test with multiple accounts** (sign up with different emails)
2. ✅ **Test mentorship requests** (send/receive/accept/decline)
3. ✅ **Test on different devices** (if available)
4. ✅ **Review production readiness** (`docs/PRODUCTION_READINESS_CHECKLIST.md`)
5. ✅ **Build APK for distribution** (when ready for real users)

## Need Help?

If you encounter any issues:
1. Check the terminal logs for specific error messages
2. Review `FIRESTORE_PERMISSIONS_FIX.md` for troubleshooting
3. Review `FIRESTORE_DEBUG_SUMMARY.md` for overview
4. Check Firebase Console for any warnings or errors

## Summary

🎉 **Firestore security rules are now set up!**

The app should now:
- ✅ Save profiles to Firebase (cloud storage)
- ✅ Update profiles in Firebase
- ✅ Sync across devices
- ✅ Work offline (graceful degradation)
- ✅ Be secure (users can only edit their own profiles)

**Happy testing!** 🚀
