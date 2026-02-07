# Meeting Display Behavior

## When Meetings Appear

### Current Behavior

Meetings appear in two places:

1. **Messages Tab** (`app/(tabs)/messages.tsx`)
   - Shows **pending meetings** (where you're the participant)
   - Shows **accepted/scheduled meetings** (where you're organizer or participant)
   - Filters out declined/cancelled meetings

2. **Requests Tab** (`app/(tabs)/requests.tsx`)
   - **Incoming Tab**: Pending meetings where you're the participant
   - **Outgoing Tab**: Pending meetings where you're the organizer
   - **Processed Tab**: Accepted/declined/cancelled meetings where you're involved

### When Data Refreshes

Data automatically refreshes in these scenarios:

1. **After Accepting/Declining a Meeting**
   - When you tap "OK" on the success alert, you're navigated back (`router.back()`)
   - The Messages/Requests tab uses `useFocusEffect` which triggers when the screen comes into focus
   - **Result**: Meetings should appear immediately when you navigate back

2. **When Navigating to Messages/Requests Tab**
   - `useFocusEffect` hook automatically reloads data when the tab gains focus
   - **Result**: Fresh data every time you switch to the tab

3. **Pull to Refresh**
   - Both tabs have pull-to-refresh functionality
   - **Result**: Manual refresh anytime

4. **On App Load**
   - Initial load when the app starts
   - **Result**: All meetings loaded on startup

## Expected Flow After Accepting a Meeting

1. User accepts meeting → `handleResponse(true)` called
2. Meeting status updated in Firebase → `hybridUpdateMeeting()` succeeds
3. Success alert shown → "Meeting accepted! It has been added to your calendar."
4. User taps "OK" → `router.back()` navigates back
5. Messages/Requests tab gains focus → `useFocusEffect` triggers
6. `loadConversations()` or `loadRequests()` called → Fresh data fetched
7. **Meeting should now appear** in:
   - Messages tab (as accepted/scheduled meeting)
   - Requests tab → Processed tab (as accepted meeting)

## If Meetings Don't Appear

### Check These:

1. **Is the meeting actually updated in Firebase?**
   - Check terminal logs for: `LOG [INFO] Meeting updated in Firestore successfully`
   - Check Firebase Console → Firestore → `meetings` collection

2. **Is the data being fetched?**
   - Check terminal logs for: `LOG [INFO] Meetings loaded` or `LOG [INFO] Meetings loaded for requests tab`
   - Should show count of meetings found

3. **Is the meeting status correct?**
   - Pending meetings: `status === 'pending'`
   - Accepted meetings: `status === 'accepted'`
   - Check that the meeting document has the correct status

4. **Is the user email matching?**
   - For Messages tab: Shows meetings where user is organizer OR participant
   - For Requests tab:
     - Incoming: `participantEmail === userEmail && status === 'pending'`
     - Outgoing: `organizerEmail === userEmail && status === 'pending'`
     - Processed: `(organizerEmail === userEmail || participantEmail === userEmail) && status !== 'pending'`

5. **Is useFocusEffect working?**
   - Check terminal logs when navigating back - should see data reload logs
   - If not, try pull-to-refresh manually

## Debugging Steps

1. **Check Terminal Logs After Accepting:**
   ```
   LOG [INFO] Meeting updated in Firestore successfully
   LOG [INFO] Meeting updated via Firebase and locally
   ```

2. **Check Terminal Logs When Navigating Back:**
   ```
   LOG [INFO] Meetings loaded { total: X, relevant: Y }
   LOG [INFO] Meetings loaded for requests tab { count: X }
   ```

3. **Check Firebase Console:**
   - Go to Firestore → `meetings` collection
   - Find the meeting document
   - Verify `status` field is `"accepted"`
   - Verify `respondedAt` field is set
   - Verify `organizerEmail` and `participantEmail` are correct

4. **Try Manual Refresh:**
   - Pull down on Messages or Requests tab
   - Check if meetings appear after refresh

## Expected Timeline

- **Immediate** (0-1 seconds): Meeting status updated in Firebase
- **Immediate** (0-1 seconds): Success alert shown
- **After tapping OK** (0-1 seconds): Navigate back, `useFocusEffect` triggers
- **After navigation** (0-2 seconds): Data reloaded, meetings appear in UI

**Total expected time: 1-4 seconds from accepting to seeing the meeting in the list**
