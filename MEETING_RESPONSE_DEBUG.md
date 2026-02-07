# Meeting Response Debug Guide

## Enhanced Error Logging

I've added comprehensive authentication and permission checking to the meeting update flow. When you try to respond to a meeting, you'll now see detailed logs in the terminal.

## What to Check in Terminal

After trying to respond to a meeting, look for these log messages:

### 1. Authentication Status
```
LOG  [INFO] Firebase auth status before meeting update {"isAuthenticated": true/false, "email": "...", "uid": "..."}
```

**If `isAuthenticated: false`:**
- ❌ **Problem**: User is not logged in to Firebase
- ✅ **Fix**: Log out and log back in to ensure Firebase authentication

### 2. Permission Check
```
LOG  [INFO] Meeting update permission check {
  "meetingId": "...",
  "userEmail": "...",
  "organizerEmail": "...",
  "participantEmail": "...",
  "isOrganizer": true/false,
  "isParticipant": true/false,
  "canUpdate": true/false
}
```

**If `canUpdate: false`:**
- ❌ **Problem**: User email doesn't match organizer or participant email
- ✅ **Fix**: Check that you're logged in with the correct account

### 3. Error Messages

#### Error: "User not authenticated in Firebase"
```
ERROR [ERROR] Cannot update meeting: user not authenticated
```
**Fix**: Log out and log back in

#### Error: "User is not authorized to update this meeting"
```
ERROR [ERROR] Permission denied: user is not organizer or participant
```
**Fix**: Make sure you're logged in as either the organizer or participant

#### Error: "Meeting not found in Firestore"
```
ERROR [ERROR] Meeting not found in Firestore before update
```
**Fix**: The meeting may have been deleted or doesn't exist in Firebase

#### Error: "permission-denied" (Firebase error code)
```
ERROR [ERROR] Error updating meeting in Firestore {"errorCode": "permission-denied"}
```
**Possible causes:**
1. Firestore security rules are blocking the update
2. User email in Firebase Auth doesn't match meeting organizer/participant email
3. Authentication token expired

**Fix**: 
- Check Firestore rules in `firestore.rules`
- Verify user is authenticated: Check terminal for auth status logs
- Try logging out and back in

## Common Issues

### Issue 1: User Not Authenticated
**Symptoms:**
- `isAuthenticated: false` in logs
- Error: "User not authenticated in Firebase"

**Solution:**
1. Go to login screen
2. Log out completely
3. Log back in with the correct account
4. Try responding to meeting again

### Issue 2: Email Mismatch
**Symptoms:**
- `canUpdate: false` in logs
- User email doesn't match organizer or participant email

**Solution:**
1. Check which account you're logged in with
2. Make sure you're logged in as the participant (for incoming requests) or organizer (for your own requests)
3. If you sent the meeting, you should see status, not buttons (this is correct behavior)

### Issue 3: Firestore Permission Denied
**Symptoms:**
- Error code: `permission-denied`
- Auth status shows authenticated, but update fails

**Solution:**
1. Check `firestore.rules` - meetings update rule should allow organizer or participant
2. Verify the meeting document in Firestore has correct `organizerEmail` and `participantEmail` fields
3. Check that Firebase Auth email matches one of these fields exactly (case-sensitive)

## Testing Steps

1. **Reload the app** (press `r` in terminal)
2. **Try to respond to a meeting**
3. **Check terminal logs** for:
   - Auth status
   - Permission check
   - Any error messages
4. **Share the logs** if issue persists

## Next Steps

If you see specific error messages, share them and I can provide targeted fixes.
