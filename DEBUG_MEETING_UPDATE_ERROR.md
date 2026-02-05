# Debug Meeting Update Error

## Issue
"Failed to respond to meeting" error when accepting/declining meetings.

## Root Cause Analysis

The app now uses **Firebase-first approach** - it tries to update Firebase first, and only falls back to local if Firebase is not configured. If Firebase update fails, the error is surfaced to help identify and fix the root cause.

## Enhanced Error Logging

The code now logs detailed Firebase error information:

1. **In `services/firebaseMeetingService.ts`**:
   - Checks if meeting exists before updating
   - Logs error code, error name, and full stack trace
   - Throws specific error if meeting not found

2. **In `app/meeting/respond.tsx`**:
   - Provides user-friendly error messages based on Firebase error codes
   - Logs full error details for debugging

## Common Firebase Error Codes

### 1. `permission-denied`
**Cause**: User doesn't have permission to update the meeting  
**Check**:
- User is authenticated in Firebase
- User email matches `organizerEmail` or `participantEmail` in the meeting
- Firestore security rules allow the update

**Fix**:
- Verify user is logged in: Check `auth.currentUser` in Firebase Console
- Verify meeting document has correct `organizerEmail` or `participantEmail`
- Check Firestore security rules for `meetings` collection

### 2. `not-found`
**Cause**: Meeting document doesn't exist in Firestore  
**Check**:
- Meeting ID is correct
- Meeting was created in Firebase (not just locally)
- Meeting wasn't deleted

**Fix**:
- Verify meeting exists in Firebase Console → Firestore → `meetings` collection
- If meeting only exists locally, it needs to be created in Firebase first
- Check if meeting was created with `hybridCreateMeeting` when Firebase was configured

### 3. `unavailable` or network errors
**Cause**: Network connectivity issues  
**Check**:
- Internet connection
- Firebase service status
- Firewall blocking Firebase requests

**Fix**:
- Check internet connection
- Verify Firebase services are operational
- Check network/firewall settings

### 4. Missing Firestore Indexes
**Cause**: Query requires an index that doesn't exist  
**Check**:
- Error message contains index creation link
- Firebase Console → Firestore → Indexes shows missing indexes

**Fix**:
- Create the required index using the link in the error message
- Or deploy all indexes: `firebase deploy --only firestore:indexes`

## Debugging Steps

### Step 1: Check Error Logs
Look for detailed error logs in the console:
```
ERROR [ERROR] Firebase update meeting failed {
  meetingId: "...",
  error: "...",
  errorCode: "permission-denied",
  errorName: "FirebaseError",
  errorStack: "..."
}
```

### Step 2: Verify Meeting Exists in Firebase
1. Go to Firebase Console: https://console.firebase.google.com/
2. Navigate to Firestore Database
3. Open `meetings` collection
4. Find the meeting by ID
5. Verify:
   - Meeting exists
   - `organizerEmail` and `participantEmail` are correct
   - User's email matches one of these fields

### Step 3: Verify User Authentication
1. Check if user is authenticated:
   ```javascript
   // In app, check auth state
   const auth = getFirebaseAuth();
   const user = auth.currentUser;
   console.log('Current user:', user?.email);
   ```
2. Verify user email matches meeting participant/organizer

### Step 4: Check Firestore Security Rules
Verify rules allow the update:
```javascript
match /meetings/{meetingId} {
  allow update: if isSignedIn() && 
    (resource.data.organizerEmail == request.auth.token.email || 
     resource.data.participantEmail == request.auth.token.email);
}
```

### Step 5: Check for Missing Indexes
If error mentions missing index:
1. Copy the index creation link from error
2. Open in browser
3. Click "Create Index"
4. Wait for index to build

## Prevention

### Ensure Meetings Are Created in Firebase
When creating meetings, make sure they're created in Firebase:
- Use `hybridCreateMeeting` which creates in Firebase if configured
- Verify meeting appears in Firebase Console after creation
- Don't create meetings only in local storage

### Ensure User Authentication
- User must be logged in via Firebase Auth
- User email must match meeting participant/organizer
- Check authentication state before responding to meetings

### Deploy All Required Indexes
Run: `firebase deploy --only firestore:indexes`

## Next Steps

When the error occurs again:
1. **Check the error logs** - Look for the detailed error message with error code
2. **Identify the error code** - Use the guide above to understand the cause
3. **Fix the root cause** - Don't work around it, fix the actual Firebase issue
4. **Verify the fix** - Test meeting response again

## Code Changes Made

1. **Firebase-first approach**: `hybridUpdateMeeting` tries Firebase first
2. **Enhanced error logging**: Full error details logged for debugging
3. **Meeting existence check**: Verifies meeting exists before updating
4. **User-friendly error messages**: Specific messages based on error codes
