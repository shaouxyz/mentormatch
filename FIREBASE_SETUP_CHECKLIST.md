# Firebase Setup Checklist

## Current Issue
You're seeing "Missing or insufficient permissions" errors when trying to get conversations from Firestore.

## Steps to Fix

### 1. ✅ Update Firestore Security Rules
1. Open Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Go to **Firestore Database** → **Rules** tab
4. Copy the entire contents of `FIRESTORE_COMPLETE_RULES.txt`
5. Paste into the rules editor (replace all existing rules)
6. Click **"Publish"** button
7. Wait for confirmation that rules are published

### 2. ✅ Verify User Authentication
The login flow has been updated to authenticate with Firebase first. When you log in:
- Firebase authentication is attempted first
- If user doesn't exist in Firebase, they're created automatically
- User should be authenticated with Firebase after login

### 3. ✅ Check Authentication Status
After logging in, check the logs for:
- ✅ "User authenticated with Firebase" - Good!
- ❌ "User not authenticated in Firebase" - Problem (shouldn't happen now)

### 4. ✅ Create Composite Index (if needed)
If you see an error about needing an index:
1. Click the link in the error message
2. Or manually create index in Firebase Console → Firestore → Indexes:
   - Collection: `conversations`
   - Fields: `participants` (Arrays, Ascending) + `updatedAt` (String, Descending)

### 5. ✅ Test
1. Log out and log back in (to ensure Firebase authentication)
2. Navigate to Messages tab
3. Check logs - should see "Conversations retrieved from Firebase" instead of permission errors

## Verification

After completing all steps, you should see:
- ✅ No "Missing or insufficient permissions" errors
- ✅ Conversations loading from Firebase
- ✅ Profile syncing to Firebase
- ✅ All data persisting correctly

## Troubleshooting

If you still see permission errors:
1. **Check rules are published**: Go to Firebase Console → Firestore → Rules, verify the rules match `FIRESTORE_COMPLETE_RULES.txt`
2. **Check user is authenticated**: Look for "User authenticated with Firebase" in logs
3. **Check Firebase Auth**: Go to Firebase Console → Authentication → Users, verify your user exists
4. **Clear app cache**: Restart the app completely
5. **Check email matches**: Ensure the email in Firebase Auth matches the email you're using in the app
