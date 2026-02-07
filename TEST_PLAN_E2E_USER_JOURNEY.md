# MentorMatch - End-to-End User Journey Test Plan

## Document Information
- **Version**: 1.1
- **Date**: 2026-02-05
- **App Version**: 1.0.0
- **Platform**: Android & iOS (React Native Expo)
- **Test Type**: End-to-End User Journey Testing

**Recent changes (v1.1)**: Messages and Requests are combined in one tab ("Messages & Requests"); dedicated Meetings tab added; Add to Calendar is a full screen (with back); invitation code feature currently disabled—signup does not require it. **Unmatch mentor/mentee**: Mentorship tab shows "Unmatch" per connection; confirm updates request to declined and removes from list.

## Overview

This test plan covers the complete user journey from app installation through all major activities a user might perform. Tests are organized in the order a real user would experience them.

---

## USER JOURNEY 1: NEW USER - COMPLETE ONBOARDING FLOW

### Phase 1: App Installation & First Launch

#### Test Case UJ1.1: Download and Install App
- **Precondition**: User has device (Android/iOS)
- **Steps**:
  1. Download app from App Store/Play Store
  2. Install app
  3. Launch app for first time
- **Expected Results**:
  - ✅ App installs successfully
  - ✅ App launches without crashes
  - ✅ Welcome screen displayed
  - ✅ "Sign Up" and "Log In" buttons visible
  - ✅ App title "MentorMatch" displayed
  - ✅ Subtitle "Connect with mentors and mentees" displayed

#### Test Case UJ1.2: First Launch - Welcome Screen
- **Precondition**: Fresh app install
- **Steps**:
  1. Launch app
  2. Observe welcome screen
- **Expected Results**:
  - ✅ Welcome screen loads within 2 seconds
  - ✅ No errors or crashes
  - ✅ Test accounts initialized in background (for testing)
  - ✅ StatusBar visible and styled correctly

### Phase 2: User Registration

#### Test Case UJ1.3: Navigate to Sign Up
- **Precondition**: On welcome screen
- **Steps**:
  1. Tap "Sign Up" button
- **Expected Results**:
  - ✅ Navigates to signup screen
  - ✅ Smooth transition animation
  - ✅ Back button available

#### Test Case UJ1.4: Sign Up with Valid Information
- **Precondition**: On signup screen
- **Steps**:
  1. Enter valid email: `newuser@example.com`
  2. Enter valid password: `SecurePass123!`
  3. Confirm password: `SecurePass123!`
  4. (If invitation code feature enabled) Enter valid invitation code: `ABC12345`
  5. Tap "Sign Up" button
- **Expected Results**:
  - ✅ Form validates all fields
  - ✅ (When invitation codes enabled) Invitation code validated and marked as used
  - ✅ Account created successfully
  - ✅ Alert: "Account created successfully"
  - ✅ Navigates to login screen
  - ✅ User data saved to AsyncStorage
  - ✅ Firebase account created (if configured)
- **Note**: Invitation code feature is currently **disabled**; signup does not show or require invitation code.

#### Test Case UJ1.5: Sign Up with Invalid Invitation Code
- **Precondition**: On signup screen
- **Steps**:
  1. Enter valid email and password
  2. Enter invalid invitation code: `INVALID123`
  3. Tap "Sign Up" button
- **Expected Results**:
  - ✅ Error message: "Invalid invitation code"
  - ✅ Account not created
  - ✅ User remains on signup screen

#### Test Case UJ1.6: Sign Up with Already Used Invitation Code
- **Precondition**: Invitation code already used
- **Steps**:
  1. Enter valid email and password
  2. Enter already-used invitation code
  3. Tap "Sign Up" button
- **Expected Results**:
  - ✅ Error message: "Invitation code already used"
  - ✅ Account not created

#### Test Case UJ1.7: Sign Up with Weak Password
- **Precondition**: On signup screen
- **Steps**:
  1. Enter valid email
  2. Enter weak password: `123`
  3. Tap "Sign Up" button
- **Expected Results**:
  - ✅ Error message: "Password must be at least 8 characters"
  - ✅ Account not created

#### Test Case UJ1.8: Sign Up with Mismatched Passwords
- **Precondition**: On signup screen
- **Steps**:
  1. Enter valid email
  2. Enter password: `SecurePass123!`
  3. Enter different confirm password: `DifferentPass123!`
  4. Tap "Sign Up" button
- **Expected Results**:
  - ✅ Error message: "Passwords do not match"
  - ✅ Account not created

### Phase 3: Profile Creation

#### Test Case UJ1.9: Navigate to Profile Creation After Sign Up
- **Precondition**: Just signed up, on login screen
- **Steps**:
  1. Log in with new credentials
- **Expected Results**:
  - ✅ Login successful
  - ✅ Navigates to profile creation screen (if no profile exists)
  - ✅ Or navigates to home screen (if profile exists)

#### Test Case UJ1.10: Create Complete Profile
- **Precondition**: On profile creation screen
- **Steps**:
  1. Enter name: `John Doe`
  2. Select expertise: `Software Engineering`
  3. Enter expertise years: `5`
  4. Select interest: `Product Management`
  5. Enter interest years: `2`
  6. Enter email: `newuser@example.com` (auto-filled)
  7. Enter phone: `+1-555-123-4567`
  8. Enter location: `San Francisco, CA` (optional)
  9. Tap "Create Profile" button
- **Expected Results**:
  - ✅ All fields validated
  - ✅ Profile created successfully
  - ✅ Profile saved to AsyncStorage
  - ✅ Profile saved to Firebase (if configured)
  - ✅ Alert: "Profile created successfully"
  - ✅ Navigates to home/discover screen
  - ✅ Profile visible in app

#### Test Case UJ1.11: Create Profile with Minimum Required Fields
- **Precondition**: On profile creation screen
- **Steps**:
  1. Enter only required fields (name, expertise, expertise years, interest, interest years, email, phone)
  2. Leave location empty
  3. Tap "Create Profile" button
- **Expected Results**:
  - ✅ Profile created successfully
  - ✅ Location field optional
  - ✅ Profile saved correctly

#### Test Case UJ1.12: Create Profile with Special Characters
- **Precondition**: On profile creation screen
- **Steps**:
  1. Enter name with special characters: `José O'Brien-Smith`
  2. Enter location with special characters: `São Paulo, Brazil`
  3. Fill other required fields
  4. Tap "Create Profile" button
- **Expected Results**:
  - ✅ Special characters handled correctly
  - ✅ Profile created successfully
  - ✅ Data displayed correctly after creation

### Phase 4: First Login

#### Test Case UJ1.13: Log In After Profile Creation
- **Precondition**: Profile created, logged out
- **Steps**:
  1. Navigate to login screen
  2. Enter email: `newuser@example.com`
  3. Enter password: `SecurePass123!`
  4. Tap "Log In" button
- **Expected Results**:
  - ✅ Login successful
  - ✅ User data loaded
  - ✅ Profile data loaded
  - ✅ Navigates to home/discover screen
  - ✅ User session established
  - ✅ Session persisted for future launches

#### Test Case UJ1.14: Auto-Login on App Relaunch
- **Precondition**: User logged in, app closed
- **Steps**:
  1. Close app completely
  2. Reopen app
- **Expected Results**:
  - ✅ App launches
  - ✅ User automatically logged in
  - ✅ Navigates directly to home screen
  - ✅ No need to enter credentials again
  - ✅ Profile data loaded automatically

---

## USER JOURNEY 2: DISCOVERY & PROFILE BROWSING

### Phase 1: Viewing Available Profiles

#### Test Case UJ2.1: View Discover Screen
- **Precondition**: User logged in with profile
- **Steps**:
  1. Navigate to Discover tab (home screen)
- **Expected Results**:
  - ✅ Discover screen loads
  - ✅ List of profiles displayed
  - ✅ Current user's profile NOT shown
  - ✅ Profiles sorted by match score (good matches first)
  - ✅ "Good Match" badge shown for matches ≥50%
  - ✅ Loading indicator shown while loading
  - ✅ Pull-to-refresh available

#### Test Case UJ2.2: Browse Multiple Profiles
- **Precondition**: On Discover screen with multiple profiles
- **Steps**:
  1. Scroll through profile list
  2. Observe different profiles
- **Expected Results**:
  - ✅ Smooth scrolling
  - ✅ All profiles display correctly
  - ✅ Profile cards show: name, expertise, interest, years of experience
  - ✅ Match score badge visible for good matches
  - ✅ No duplicates
  - ✅ Pagination works (loads more on scroll)

#### Test Case UJ2.3: Search for Specific Profile
- **Precondition**: On Discover screen
- **Steps**:
  1. Tap search bar
  2. Enter search term: `Software`
  3. Observe results
- **Expected Results**:
  - ✅ Search bar becomes active
  - ✅ Results filter by search term
  - ✅ Search is case-insensitive
  - ✅ Results update as user types
  - ✅ Clear button appears
  - ✅ Matching profiles highlighted

#### Test Case UJ2.4: Clear Search
- **Precondition**: Search active with results
- **Steps**:
  1. Tap clear button (X)
- **Expected Results**:
  - ✅ Search cleared
  - ✅ All profiles shown again
  - ✅ Search bar empty

#### Test Case UJ2.5: View Profile Details
- **Precondition**: On Discover screen
- **Steps**:
  1. Tap on a profile card
- **Expected Results**:
  - ✅ Navigates to profile view screen
  - ✅ Full profile details displayed:
    - Name
    - Expertise and years
    - Interest and years
    - Location (if provided)
  - ✅ Email and phone NOT visible (not matched yet)
  - ✅ "Request as Mentor" button visible
  - ✅ Back button works

#### Test Case UJ2.6: View Profile with Good Match Badge
- **Precondition**: Profile with match score ≥50%
- **Steps**:
  1. View profile card on Discover screen
- **Expected Results**:
  - ✅ "Good Match" badge displayed
  - ✅ Badge shows scholar icon
  - ✅ Badge color is purple
  - ✅ Badge visible on profile card

#### Test Case UJ2.7: View Profile Without Match Badge
- **Precondition**: Profile with match score <50%
- **Steps**:
  1. View profile card on Discover screen
- **Expected Results**:
  - ✅ No "Good Match" badge displayed
  - ✅ Profile card shows normally

---

## USER JOURNEY 3: MENTORSHIP REQUEST FLOW

### Phase 1: Sending Mentor Request

#### Test Case UJ3.1: Send Mentor Request
- **Precondition**: Viewing another user's profile
- **Steps**:
  1. Tap "Request as Mentor" button
  2. Navigate to send request screen
  3. Enter note: `I would like to learn from you about Software Engineering.`
  4. Tap "Send Request" button
- **Expected Results**:
  - ✅ Navigates to send request screen
  - ✅ Mentor name and email displayed
  - ✅ Note field available
  - ✅ Character counter visible (if note entered)
  - ✅ Request sent successfully
  - ✅ Alert: "Request Sent"
  - ✅ Navigates back to profile view
  - ✅ Request saved to AsyncStorage
  - ✅ Request saved to Firebase (if configured)
  - ✅ Request status: 'pending'

#### Test Case UJ3.2: Send Request Without Note
- **Precondition**: On send request screen
- **Steps**:
  1. Leave note field empty
  2. Tap "Send Request" button
- **Expected Results**:
  - ✅ Request sent successfully
  - ✅ Request created with empty note
  - ✅ No validation error

#### Test Case UJ3.3: Send Request with Long Note
- **Precondition**: On send request screen
- **Steps**:
  1. Enter note at character limit (500 characters)
  2. Try to enter more characters
  3. Tap "Send Request" button
- **Expected Results**:
  - ✅ Character limit enforced
  - ✅ Cannot exceed 500 characters
  - ✅ Character counter shows correct count
  - ✅ Request sent successfully

#### Test Case UJ3.4: Prevent Duplicate Request
- **Precondition**: Pending request already exists to same mentor
- **Steps**:
  1. Try to send another request to same mentor
- **Expected Results**:
  - ✅ Alert: "Request Already Sent"
  - ✅ No duplicate request created
  - ✅ Existing request remains

### Phase 2: Receiving and Responding to Mentor Request

#### Test Case UJ3.5: View Incoming Request
- **Precondition**: User logged in as mentor, has incoming request
- **Steps**:
  1. Navigate to Messages & Requests tab
  2. View "Incoming" tab
- **Expected Results**:
  - ✅ Messages & Requests tab loads (combined messages and requests)
  - ✅ "Incoming" tab shows pending requests (where user is mentor; self-sent excluded)
   - ✅ Requester name displayed
   - ✅ Requester email displayed
   - ✅ Request note displayed
   - ✅ "Accept" and "Decline" buttons visible
   - ✅ Timestamp shown
   - ✅ Request sorted by most recent first

#### Test Case UJ3.6: Accept Mentor Request
- **Precondition**: Viewing incoming request
- **Steps**:
  1. Tap "Accept" button
  2. Navigate to respond screen
  3. Enter response note: `Happy to help! Looking forward to working with you.`
  4. Tap "Accept" button
- **Expected Results**:
  - ✅ Navigates to respond screen
  - ✅ Request details displayed
  - ✅ Response note field available
  - ✅ Request accepted successfully
  - ✅ Request status updated to 'accepted'
  - ✅ Response note saved
  - ✅ Request moved to "Processed" tab
  - ✅ Connection established
  - ✅ (When invitation codes enabled) Invitation code generated and added to inbox
  - ✅ Alert: "Request accepted"
  - ✅ Navigates back to requests screen

#### Test Case UJ3.7: Accept Request Without Response Note
- **Precondition**: On respond screen
- **Steps**:
  1. Leave response note empty
  2. Tap "Accept" button
- **Expected Results**:
  - ✅ Request accepted successfully
  - ✅ Empty response note saved
  - ✅ Invitation code still generated

#### Test Case UJ3.8: Decline Mentor Request
- **Precondition**: Viewing incoming request
- **Steps**:
  1. Tap "Decline" button
  2. Navigate to respond screen
  3. Enter response note: `Sorry, I'm currently at capacity.`
  4. Tap "Decline" button
- **Expected Results**:
  - ✅ Request declined successfully
  - ✅ Request status updated to 'declined'
  - ✅ Response note saved
  - ✅ Request moved to "Processed" tab
  - ✅ No invitation code generated
  - ✅ Alert: "Request declined"
  - ✅ Navigates back to requests screen

#### Test Case UJ3.9: View Sent Requests
- **Precondition**: User has sent requests
- **Steps**:
  1. Navigate to Messages & Requests tab
  2. View "Sent" tab
- **Expected Results**:
  - ✅ "Sent" tab shows all sent requests (and sent conversations)
  - ✅ Mentor name displayed
  - ✅ Status shown (pending/accepted/declined)
  - ✅ Request note displayed
  - ✅ Timestamp shown

#### Test Case UJ3.10: View Processed Requests
- **Precondition**: User has accepted/declined requests
- **Steps**:
  1. Navigate to Messages & Requests tab
  2. View "Processed" tab
- **Expected Results**:
  - ✅ "Processed" tab shows all processed requests (with role label: Accepted (Mentor) / (Mentee))
  - ✅ Accepted requests shown with "Accepted" badge
  - ✅ Declined requests shown with "Declined" badge
  - ✅ Response notes displayed
  - ✅ Sorted by most recent first

### Phase 3: Viewing Connections

#### Test Case UJ3.11: View My Mentors
- **Precondition**: User has accepted requests (as requester)
- **Steps**:
  1. Navigate to Mentorship tab
  2. View "My Mentors" section
- **Expected Results**:
  - ✅ Mentorship tab loads
  - ✅ "My Mentors" section displayed
  - ✅ All accepted mentors shown
  - ✅ Mentor name displayed
  - ✅ Mentor expertise displayed
  - ✅ Response note displayed (if exists)
  - ✅ Connected date shown
  - ✅ "Message", "Schedule", and "Unmatch" buttons visible

#### Test Case UJ3.12: View My Mentees
- **Precondition**: User has accepted requests (as mentor)
- **Steps**:
  1. Navigate to Mentorship tab
  2. View "My Mentees" section
- **Expected Results**:
  - ✅ "My Mentees" section displayed
  - ✅ All accepted mentees shown
  - ✅ Mentee name displayed
  - ✅ Mentee interest displayed
  - ✅ Original request note displayed (if exists)
  - ✅ Connected date shown
  - ✅ "Message", "Schedule", and "Unmatch" buttons visible

#### Test Case UJ3.13: View Matched Profile Contact Info
- **Precondition**: User has accepted connection with another user
- **Steps**:
  1. Navigate to Mentorship tab
  2. Tap on a mentor/mentee card
  3. View their profile
- **Expected Results**:
  - ✅ Navigates to profile view
  - ✅ **Email and phone number NOW visible** (matched)
  - ✅ Contact information displayed
  - ✅ Can tap email to send email
  - ✅ Can tap phone to call

#### Test Case UJ3.14: View Unmatched Profile Contact Info
- **Precondition**: User viewing profile of non-matched user
- **Steps**:
  1. View profile of user without connection
- **Expected Results**:
  - ✅ Email and phone number NOT visible
  - ✅ Contact info hidden
  - ✅ Only public profile info shown

#### Test Case UJ3.15: Unmatch Mentor
- **Precondition**: User has at least one mentor
- **Steps**:
  1. Navigate to Mentorship tab
  2. Tap "Unmatch" on a mentor card
  3. In alert, tap "Unmatch" (confirm)
- **Expected Results**:
  - ✅ Confirmation alert: remove from mentors
  - ✅ Request status updated to declined
  - ✅ Mentor no longer appears in My Mentors
  - ✅ List refreshed

#### Test Case UJ3.16: Unmatch Mentee
- **Precondition**: User has at least one mentee
- **Steps**:
  1. Navigate to Mentorship tab
  2. Tap "Unmatch" on a mentee card
  3. In alert, tap "Unmatch" (confirm)
- **Expected Results**:
  - ✅ Confirmation alert: remove from mentees
  - ✅ Request status updated to declined
  - ✅ Mentee no longer appears in My Mentees
  - ✅ List refreshed

#### Test Case UJ3.17: Cancel Unmatch
- **Precondition**: User has at least one connection
- **Steps**:
  1. Tap "Unmatch" on a mentor or mentee
  2. In alert, tap "Cancel"
- **Expected Results**:
  - ✅ Alert dismissed
  - ✅ Connection still in list
  - ✅ No status change

---

## USER JOURNEY 4: INVITATION CODE SYSTEM

**Note**: Invitation code feature is currently **disabled** (`config.features.enableInvitationCodes: false`). The cases below apply when the feature is re-enabled.

### Phase 1: Receiving Invitation Code

#### Test Case UJ4.1: Receive Invitation Code After Accepting Mentee
- **Precondition**: User accepted a mentee request
- **Steps**:
  1. Accept a mentee request
  2. Navigate to Inbox/Messages tab
  3. Check for new notifications
- **Expected Results**:
  - ✅ Invitation code generated automatically
  - ✅ Invitation code added to inbox
  - ✅ Inbox item type: 'invitation_code'
  - ✅ Title: "New Invitation Code"
  - ✅ Message explains invitation code
  - ✅ Invitation code displayed
  - ✅ Unread badge shown

#### Test Case UJ4.2: View Invitation Code in Inbox
- **Precondition**: User has invitation code in inbox
- **Steps**:
  1. Navigate to inbox/notifications
  2. View invitation code item
- **Expected Results**:
  - ✅ Invitation code item displayed
  - ✅ Code clearly visible
  - ✅ Instructions on how to use it
  - ✅ Can copy code
  - ✅ Item marked as read when viewed

#### Test Case UJ4.3: Share Invitation Code
- **Precondition**: Viewing invitation code in inbox
- **Steps**:
  1. Copy invitation code
  2. Share with another person
- **Expected Results**:
  - ✅ Code can be copied
  - ✅ Code format is clear and shareable
  - ✅ Code is valid for one-time use

---

## USER JOURNEY 5: MESSAGING FLOW

### Phase 1: Sending Messages

#### Test Case UJ5.1: Navigate to Messages
- **Precondition**: User has connections
- **Steps**:
  1. Navigate to Messages & Requests tab (conversations appear in Incoming/Sent/Processed)
- **Expected Results**:
  - ✅ Messages & Requests tab loads (combined with mentorship requests)
  - ✅ List of conversations displayed where applicable
  - ✅ Conversations with matched users shown
  - ✅ Unread message badges visible
  - ✅ Last message preview shown
  - ✅ Timestamp shown

#### Test Case UJ5.2: Start New Conversation
- **Precondition**: On Messages & Requests tab, have matched connection
- **Steps**:
  1. Tap on a conversation (or start new)
  2. Navigate to chat screen
- **Expected Results**:
  - ✅ Navigates to chat screen
  - ✅ Other user's name displayed
  - ✅ Chat input field visible
  - ✅ Send button visible
  - ✅ Message history loaded (if exists)
  - ✅ Empty state if no messages yet

#### Test Case UJ5.3: Send First Message
- **Precondition**: On chat screen with matched user
- **Steps**:
  1. Type message: `Hello! Thanks for accepting my request.`
  2. Tap "Send" button
- **Expected Results**:
  - ✅ Message sent successfully
  - ✅ Message appears in chat
  - ✅ Message shows sender name
  - ✅ Timestamp displayed
  - ✅ Message saved to AsyncStorage
  - ✅ Message saved to Firebase (if configured)
  - ✅ Conversation created if first message

#### Test Case UJ5.4: Send Multiple Messages
- **Precondition**: In active conversation
- **Steps**:
  1. Send message 1: `How are you doing?`
  2. Send message 2: `I have some questions about your expertise.`
  3. Send message 3: `Can we schedule a call?`
- **Expected Results**:
  - ✅ All messages sent successfully
  - ✅ Messages appear in chronological order
  - ✅ Each message has timestamp
  - ✅ Messages scroll to bottom automatically
  - ✅ Conversation updated with last message

#### Test Case UJ5.5: Send Message with Special Characters
- **Precondition**: On chat screen
- **Steps**:
  1. Type message with special characters: `Hello! How's it going? 😊 Let's meet @ 3pm.`
  2. Tap "Send" button
- **Expected Results**:
  - ✅ Special characters handled correctly
  - ✅ Emojis displayed correctly
  - ✅ Message sent and displayed properly

### Phase 2: Receiving Messages

#### Test Case UJ5.6: Receive Message Notification
- **Precondition**: User has app open, receives new message
- **Steps**:
  1. Another user sends message
  2. Observe app behavior
- **Expected Results**:
  - ✅ Message received in real-time (if Firebase configured)
  - ✅ Unread badge updated
  - ✅ Conversation list updated
  - ✅ Last message preview updated
  - ✅ Notification may appear (platform dependent)

#### Test Case UJ5.7: View Received Message
- **Precondition**: User has unread messages
- **Steps**:
  1. Navigate to Messages & Requests tab
  2. View conversation with unread message (in relevant sub-tab)
  3. Open conversation
- **Expected Results**:
  - ✅ Unread badge visible on conversation
  - ✅ Navigate to chat screen
  - ✅ Received message displayed
  - ✅ Message shows sender name
  - ✅ Timestamp displayed
  - ✅ Message marked as read
  - ✅ Unread badge removed

#### Test Case UJ5.8: View Message History
- **Precondition**: Conversation with multiple messages
- **Steps**:
  1. Open conversation
  2. Scroll through message history
- **Expected Results**:
  - ✅ All messages displayed
  - ✅ Messages in chronological order
  - ✅ Sender names shown correctly
  - ✅ Timestamps displayed
  - ✅ Smooth scrolling
  - ✅ Can scroll to top/bottom

### Phase 3: Replying to Messages

#### Test Case UJ5.9: Reply to Message
- **Precondition**: Viewing received message
- **Steps**:
  1. Read received message
  2. Type reply: `Thanks for reaching out! I'd be happy to help.`
  3. Tap "Send" button
- **Expected Results**:
  - ✅ Reply sent successfully
  - ✅ Reply appears in chat
  - ✅ Reply shows as sent by current user
  - ✅ Conversation updated
  - ✅ Other user receives reply

#### Test Case UJ5.10: Continue Conversation Thread
- **Precondition**: Active conversation
- **Steps**:
  1. Send message
  2. Receive reply
  3. Send another message
  4. Continue back and forth
- **Expected Results**:
  - ✅ Conversation flows naturally
  - ✅ Messages appear in correct order
  - ✅ Both users' messages displayed correctly
  - ✅ Real-time updates work (if Firebase configured)
  - ✅ No message loss

#### Test Case UJ5.11: Message Multiple Connections
- **Precondition**: User has multiple matched connections
- **Steps**:
  1. Send message to Connection A
  2. Navigate back to conversation list
  3. Send message to Connection B
  4. Switch between conversations
- **Expected Results**:
  - ✅ Multiple conversations maintained
  - ✅ Can switch between conversations
  - ✅ Each conversation has its own history
  - ✅ Last message shown for each conversation
  - ✅ Unread counts correct for each

---

## USER JOURNEY 6: MEETING SCHEDULING FLOW

### Phase 1: Scheduling a Meeting

#### Test Case UJ6.1: Navigate to Schedule Meeting
- **Precondition**: User has matched connection
- **Steps**:
  1. Navigate to Mentorship tab
  2. Tap on a mentor/mentee card
  3. Tap "Schedule" button
- **Expected Results**:
  - ✅ Navigates to schedule meeting screen
  - ✅ Participant name and email displayed
  - ✅ Meeting form visible
  - ✅ Back button available

#### Test Case UJ6.2: Schedule Virtual Meeting
- **Precondition**: On schedule meeting screen
- **Steps**:
  1. Enter title: `Introduction Call`
  2. Select "Virtual" location type
  3. Enter meeting link: `https://zoom.us/j/123456789`
  4. Select date: Tomorrow
  5. Select time: 2:00 PM
  6. Enter duration: `60` minutes
  7. Enter description: `Let's discuss your career goals and how I can help.`
  8. Tap "Schedule Meeting" button
- **Expected Results**:
  - ✅ All fields validated
  - ✅ Meeting link required for virtual
  - ✅ Meeting created successfully
  - ✅ Meeting saved to AsyncStorage
  - ✅ Meeting saved to Firebase (if configured)
  - ✅ Meeting status: 'pending'
  - ✅ Alert: "Meeting request sent"
  - ✅ Navigates back
  - ✅ Meeting appears in upcoming meetings (after acceptance)

#### Test Case UJ6.3: Schedule In-Person Meeting
- **Precondition**: On schedule meeting screen
- **Steps**:
  1. Enter title: `Coffee Meeting`
  2. Select "In-Person" location type
  3. Enter location: `Starbucks, 123 Main St, San Francisco, CA`
  4. Select date: Next week
  5. Select time: 10:00 AM
  6. Enter duration: `90` minutes
  7. Enter description: `Let's meet for coffee to discuss mentorship.`
  8. Tap "Schedule Meeting" button
- **Expected Results**:
  - ✅ Location required for in-person
  - ✅ Meeting created successfully
  - ✅ Location saved correctly
  - ✅ Meeting link not required

#### Test Case UJ6.4: Schedule Phone Meeting
- **Precondition**: On schedule meeting screen
- **Steps**:
  1. Enter title: `Phone Call`
  2. Select "Phone" location type
  3. Enter phone number: `+1-555-123-4567`
  4. Select date and time
  5. Enter duration
  6. Tap "Schedule Meeting" button
- **Expected Results**:
  - ✅ Phone number required for phone meetings
  - ✅ Meeting created successfully
  - ✅ Phone number saved in location field
  - ✅ Meeting link not required

#### Test Case UJ6.5: Schedule Meeting Without Description
- **Precondition**: On schedule meeting screen
- **Steps**:
  1. Fill all required fields
  2. Leave description empty
  3. Tap "Schedule Meeting" button
- **Expected Results**:
  - ✅ Meeting created successfully
  - ✅ Description is optional
  - ✅ Meeting saved without description

### Phase 2: Receiving and Responding to Meeting Request

#### Test Case UJ6.6: View Meeting Request
- **Precondition**: User received meeting request
- **Steps**:
  1. Navigate to Requests tab or check notifications
  2. View meeting request
- **Expected Results**:
  - ✅ Meeting request visible
  - ✅ Meeting details displayed:
    - Title
    - Date and time
    - Location/meeting link
    - Duration
    - Description (if provided)
  - ✅ Organizer name displayed
  - ✅ Accept/Decline options available

#### Test Case UJ6.7: Accept Meeting Request
- **Precondition**: Viewing meeting request
- **Steps**:
  1. Tap "Accept" or navigate to meeting response screen
  2. View meeting details
  3. Optionally enter response note: `Looking forward to our meeting!`
  4. Tap "Accept" button
- **Expected Results**:
  - ✅ Meeting status updated to 'accepted'
  - ✅ Response note saved (if provided)
  - ✅ Meeting added to upcoming meetings
  - ✅ **Notifications scheduled automatically:**
    - Day before (9 AM)
    - 1 hour before
    - 5 minutes before
  - ✅ Alert: "Meeting accepted! It has been added to your calendar."
  - ✅ Navigates back

#### Test Case UJ6.8: Accept Meeting Without Response Note
- **Precondition**: On meeting response screen
- **Steps**:
  1. Leave response note empty
  2. Tap "Accept" button
- **Expected Results**:
  - ✅ Meeting accepted successfully
  - ✅ Empty response note saved
  - ✅ Notifications still scheduled

#### Test Case UJ6.9: Decline Meeting Request
- **Precondition**: Viewing meeting request
- **Steps**:
  1. Navigate to meeting response screen
  2. Enter response note: `Sorry, I'm not available at that time.`
  3. Tap "Decline" button
- **Expected Results**:
  - ✅ Meeting status updated to 'declined'
  - ✅ Response note saved
  - ✅ **Notifications cancelled** (if any were scheduled)
  - ✅ Meeting NOT added to upcoming meetings
  - ✅ Alert: "Meeting declined."
  - ✅ Navigates back

### Phase 3: Viewing Meetings (Meetings Tab)

**Overview**: A dedicated **Meetings** tab provides Upcoming, Incoming, Sent, Processed. Upcoming shows only future meetings (past excluded); self-meetings excluded. "Add to Calendar" opens a full Add to Calendar screen (user can go back without adding).

#### Test Case UJ6.10: View Upcoming Meetings
- **Precondition**: User has accepted meetings
- **Steps**:
  1. Navigate to Meetings tab, view Upcoming (or open Upcoming from Mentorship)
- **Expected Results**:
   - ✅ Upcoming Meetings screen loads
   - ✅ Only future meetings (meetingDate >= now); past excluded
   - ✅ Self-meetings excluded
   - ✅ Meetings sorted by date/time (soonest first)
   - ✅ Meeting details shown: Title, Date/time, Location/link, Duration, Participant/organizer
   - ✅ "Add to Calendar" opens Add to Calendar screen (not blocking alert)
   - ✅ Pull-to-refresh available

#### Test Case UJ6.11: View Meeting Details
- **Precondition**: On upcoming meetings screen
- **Steps**:
  1. View a meeting card
- **Expected Results**:
  - ✅ Meeting title displayed
  - ✅ Date formatted correctly (Today/Tomorrow or full date)
  - ✅ Time displayed
  - ✅ Location or meeting link displayed
  - ✅ Duration shown
  - ✅ Description shown (if provided)
  - ✅ Participant/organizer name shown

#### Test Case UJ6.12: Filter Past vs Upcoming Meetings
- **Precondition**: User has both past and upcoming meetings
- **Steps**:
  1. View upcoming meetings screen
- **Expected Results**:
  - ✅ Only upcoming meetings shown
  - ✅ Past meetings NOT shown
  - ✅ Meetings filtered by current date/time

### Phase 4: Calendar Integration (Add to Calendar Screen)

**Overview**: "Add to Calendar" navigates to **Add to Calendar** screen; user can go back without adding. If already added to phone calendar, app shows "Already added" and does not open calendar app again.

#### Test Case UJ6.13: Add Meeting to Phone Calendar (iOS/Android)
- **Precondition**: Viewing upcoming meeting, not yet added to phone calendar
- **Steps**:
  1. Tap "Add to Calendar" (navigates to Add to Calendar screen)
  2. Tap "Add to Phone Calendar", grant permissions if prompted, confirm
- **Expected Results**:
  - ✅ Add to Calendar screen opens (not blocking Alert); user can cancel by going back
  - ✅ Calendar permission requested when adding to phone
  - ✅ Meeting added to selected calendar; details included (title, date/time, duration, location)
  - ✅ Success message; optionally calendar app opens so user sees event

#### Test Case UJ6.13a: Add to Calendar - Already Added to Phone
- **Precondition**: Meeting was previously added to phone calendar
- **Steps**:
  1. Open Add to Calendar for same meeting, tap "Add to Phone Calendar"
- **Expected Results**:
  - ✅ Message that event is already added; calendar app not opened again

#### Test Case UJ6.14: Add Meeting to Google Calendar
- **Precondition**: Viewing upcoming meeting
- **Steps**:
  1. Tap "Add to Calendar" (opens Add to Calendar screen)
  2. Tap "Google Calendar" option
- **Expected Results**:
  - ✅ Google Calendar link generated
  - ✅ Link opens in browser or Google Calendar app
  - ✅ Meeting details pre-filled in Google Calendar
  - ✅ User can save to Google Calendar
  - ✅ Meeting appears in Google Calendar

#### Test Case UJ6.15: Add Meeting to Outlook/Hotmail Calendar
- **Precondition**: Viewing upcoming meeting
- **Steps**:
  1. Tap "Add to Calendar" (opens Add to Calendar screen)
  2. Tap "Outlook Calendar" option
- **Expected Results**:
  - ✅ Outlook Calendar link generated
  - ✅ Link opens in browser or Outlook app
  - ✅ Meeting details pre-filled in Outlook Calendar
  - ✅ User can save to Outlook Calendar
  - ✅ Meeting appears in Outlook Calendar

#### Test Case UJ6.16: Calendar Permission Denial
- **Precondition**: User denies calendar permission
- **Steps**:
  1. Open Add to Calendar screen, tap "Add to Phone Calendar"
  2. Deny permission when prompted
- **Expected Results**:
  - ✅ Permission request shown
  - ✅ Alert or message: calendar permission required
  - ✅ Meeting NOT added to calendar
  - ✅ User can go back from Add to Calendar screen without adding

### Phase 5: Meeting Reminders/Notifications

#### Test Case UJ6.17: Receive Day-Before Meeting Reminder
- **Precondition**: Meeting scheduled for tomorrow, notifications enabled
- **Steps**:
  1. Wait until day before meeting (9 AM)
  2. Check for notification
- **Expected Results**:
  - ✅ Notification received at 9 AM the day before
  - ✅ Notification title: "Meeting Reminder: [Meeting Title]"
  - ✅ Notification body includes:
    - Meeting title
    - Meeting time
    - Meeting date
    - Location/meeting link
    - Participant/organizer name
  - ✅ Notification appears on device
  - ✅ Notification can be tapped to open app

#### Test Case UJ6.18: Receive 1-Hour-Before Meeting Reminder
- **Precondition**: Meeting scheduled, 1 hour before meeting time
- **Steps**:
  1. Wait until 1 hour before meeting
  2. Check for notification
- **Expected Results**:
  - ✅ Notification received exactly 1 hour before meeting
  - ✅ Notification title: "Meeting in 1 Hour: [Meeting Title]"
  - ✅ Notification body includes:
    - Meeting time
    - Location/meeting link
    - Participant/organizer name
  - ✅ Notification appears on device
  - ✅ User reminded meeting is starting soon

#### Test Case UJ6.19: Receive 5-Minutes-Before Meeting Reminder
- **Precondition**: Meeting scheduled, 5 minutes before meeting time
- **Steps**:
  1. Wait until 5 minutes before meeting
  2. Check for notification
- **Expected Results**:
  - ✅ Notification received exactly 5 minutes before meeting
  - ✅ Notification title: "Meeting Starting Soon: [Meeting Title]"
  - ✅ Notification body includes:
    - Meeting time
    - Location/meeting link
    - Participant/organizer name
  - ✅ Notification appears on device
  - ✅ User reminded meeting is starting now

#### Test Case UJ6.20: All Three Reminders for Same Meeting
- **Precondition**: Meeting scheduled 2+ days in advance
- **Steps**:
  1. Accept meeting scheduled for 2+ days from now
  2. Wait and observe notifications
- **Expected Results**:
  - ✅ Day-before notification scheduled and received
  - ✅ 1-hour-before notification scheduled and received
  - ✅ 5-minutes-before notification scheduled and received
  - ✅ All three notifications received at correct times
  - ✅ Each notification has appropriate content

#### Test Case UJ6.21: Skip Past Reminders
- **Precondition**: Meeting scheduled for tomorrow (less than 1 day away)
- **Steps**:
  1. Accept meeting scheduled for tomorrow
- **Expected Results**:
  - ✅ Day-before notification NOT scheduled (already past)
  - ✅ 1-hour-before notification scheduled
  - ✅ 5-minutes-before notification scheduled
  - ✅ Only applicable notifications scheduled

#### Test Case UJ6.22: Notification Permission Denial
- **Precondition**: User denies notification permissions
- **Steps**:
  1. Deny notification permissions
  2. Accept a meeting
- **Expected Results**:
  - ✅ Meeting still accepted successfully
  - ✅ No notifications scheduled
  - ✅ Warning logged (not shown to user)
  - ✅ User can still view meeting in app

#### Test Case UJ6.23: Notification Content for Virtual Meeting
- **Precondition**: Virtual meeting with link
- **Steps**:
  1. Receive meeting reminder notification
- **Expected Results**:
  - ✅ Notification includes meeting link
  - ✅ Link is clickable/accessible
  - ✅ Link clearly labeled in notification

#### Test Case UJ6.24: Notification Content for In-Person Meeting
- **Precondition**: In-person meeting with location
- **Steps**:
  1. Receive meeting reminder notification
- **Expected Results**:
  - ✅ Notification includes location address
  - ✅ Location clearly labeled
  - ✅ Address complete and accurate

#### Test Case UJ6.25: Notification Content for Phone Meeting
- **Precondition**: Phone meeting with phone number
- **Steps**:
  1. Receive meeting reminder notification
- **Expected Results**:
  - ✅ Notification includes phone number
  - ✅ Phone number clearly labeled
  - ✅ Number formatted correctly

#### Test Case UJ6.26: Cancel Notifications When Meeting Declined
- **Precondition**: Meeting has scheduled notifications
- **Steps**:
  1. Decline a meeting that had notifications scheduled
- **Expected Results**:
  - ✅ All scheduled notifications cancelled
  - ✅ No reminders sent for declined meeting
  - ✅ Notification records cleaned up

---

## USER JOURNEY 7: PROFILE MANAGEMENT

### Phase 1: Viewing Own Profile

#### Test Case UJ7.1: View Own Profile
- **Precondition**: User logged in with profile
- **Steps**:
  1. Navigate to Profile tab
- **Expected Results**:
  - ✅ Profile tab loads
  - ✅ Own profile displayed
  - ✅ All profile fields shown:
    - Name
    - Email
    - Phone
    - Expertise and years
    - Interest and years
    - Location (if provided)
  - ✅ "Edit Profile" button visible
  - ✅ "Log Out" button visible

#### Test Case UJ7.2: View Own Profile Contact Info
- **Precondition**: On Profile tab
- **Steps**:
  1. View own profile
- **Expected Results**:
  - ✅ Email visible (own profile)
  - ✅ Phone visible (own profile)
  - ✅ Contact info always visible for own profile

### Phase 2: Editing Profile

#### Test Case UJ7.3: Edit Profile
- **Precondition**: On Profile tab
- **Steps**:
  1. Tap "Edit Profile" button
  2. Navigate to edit screen
  3. Update expertise years: `6` (was 5)
  4. Update location: `New York, NY` (was San Francisco)
  5. Tap "Save" button
- **Expected Results**:
  - ✅ Navigates to edit screen
  - ✅ All current profile data pre-filled
  - ✅ Can update any field
  - ✅ Changes saved successfully
  - ✅ Profile updated in AsyncStorage
  - ✅ Profile updated in Firebase (if configured)
  - ✅ Alert: "Profile updated successfully"
  - ✅ Navigates back to Profile tab
  - ✅ Updated data displayed

#### Test Case UJ7.4: Edit Profile - Remove Location
- **Precondition**: Profile has location
- **Steps**:
  1. Edit profile
  2. Clear location field
  3. Save
- **Expected Results**:
  - ✅ Location removed successfully
  - ✅ Profile saved without location
  - ✅ Location field empty on profile view

---

## USER JOURNEY 8: SESSION MANAGEMENT

### Phase 1: App Relaunch

#### Test Case UJ8.1: App Relaunch - Stay Logged In
- **Precondition**: User logged in, app closed
- **Steps**:
  1. Close app completely
  2. Reopen app
- **Expected Results**:
  - ✅ App launches
  - ✅ User automatically logged in
  - ✅ Session persisted
  - ✅ Navigates directly to home screen
  - ✅ Profile data loaded
  - ✅ All data available

#### Test Case UJ8.2: App Relaunch - Load All Data
- **Precondition**: User logged in with profile, requests, messages, meetings
- **Steps**:
  1. Close app
  2. Reopen app
- **Expected Results**:
  - ✅ User logged in
  - ✅ Profile loaded
  - ✅ Requests loaded
  - ✅ Messages/conversations loaded
  - ✅ Meetings loaded
  - ✅ All data synchronized (if Firebase configured)

### Phase 2: Logout

#### Test Case UJ8.3: Log Out
- **Precondition**: User logged in
- **Steps**:
  1. Navigate to Profile tab
  2. Tap "Log Out" button
  3. Confirm logout
- **Expected Results**:
  - ✅ User data cleared
  - ✅ Session ended
  - ✅ Navigates to welcome/login screen
  - ✅ Cannot access protected screens
  - ✅ Must log in again to access app

#### Test Case UJ8.4: Log Out and Log Back In
- **Precondition**: User logged in
- **Steps**:
  1. Log out
  2. Log back in with same credentials
- **Expected Results**:
  - ✅ Logout successful
  - ✅ Login successful
  - ✅ All data loaded again
  - ✅ Profile restored
  - ✅ Connections restored
  - ✅ Messages restored
  - ✅ Meetings restored

---

## USER JOURNEY 9: MULTI-USER INTERACTIONS

### Phase 1: Two Users - Complete Flow

#### Test Case UJ9.1: User A Sends Request to User B
- **Precondition**: Two users, User A and User B, both have profiles
- **Steps**:
  1. User A logs in
  2. User A views User B's profile
  3. User A sends mentor request to User B
- **Expected Results**:
  - ✅ Request sent successfully
  - ✅ Request appears in User A's "Sent" tab
  - ✅ Request appears in User B's "Incoming" tab (when User B logs in)
  - ✅ Request status: 'pending'

#### Test Case UJ9.2: User B Receives and Accepts Request
- **Precondition**: User A sent request to User B
- **Steps**:
  1. User B logs in
  2. User B views "Incoming" requests
  3. User B accepts request
- **Expected Results**:
  - ✅ Request accepted successfully
  - ✅ Connection established
  - ✅ Request moved to "Processed" tab for both users
  - ✅ User B receives invitation code
  - ✅ Both users can now see each other's contact info
  - ✅ Both users can message each other
  - ✅ Both users can schedule meetings

#### Test Case UJ9.3: User A and User B Exchange Messages
- **Precondition**: User A and User B are connected
- **Steps**:
  1. User A sends message to User B
  2. User B receives and replies
  3. User A receives reply
  4. Continue conversation
- **Expected Results**:
  - ✅ Messages sent and received correctly
  - ✅ Real-time updates work (if Firebase configured)
  - ✅ Message history maintained
  - ✅ Both users see complete conversation
  - ✅ Unread badges update correctly

#### Test Case UJ9.4: User A Schedules Meeting with User B
- **Precondition**: User A and User B are connected
- **Steps**:
  1. User A schedules meeting with User B
  2. User B receives meeting request
  3. User B accepts meeting
- **Expected Results**:
  - ✅ Meeting request sent successfully
  - ✅ User B sees meeting request
  - ✅ User B accepts meeting
  - ✅ Meeting appears in both users' upcoming meetings
  - ✅ Notifications scheduled for both users
  - ✅ Both users can add to calendar

#### Test Case UJ9.5: Both Users Receive Meeting Reminders
- **Precondition**: Meeting scheduled and accepted by both users
- **Steps**:
  1. Wait for reminder times
- **Expected Results**:
  - ✅ User A receives all three reminders
  - ✅ User B receives all three reminders
  - ✅ Reminders received at correct times
  - ✅ Reminder content accurate for each user

---

## USER JOURNEY 10: EDGE CASES & ERROR SCENARIOS

### Phase 1: Network and Connectivity

#### Test Case UJ10.1: Offline Mode - View Cached Data
- **Precondition**: User logged in, app has cached data
- **Steps**:
  1. Turn off network/WiFi
  2. Use app
- **Expected Results**:
  - ✅ App still works
  - ✅ Cached data displayed
  - ✅ Can view profiles (cached)
  - ✅ Can view messages (cached)
  - ✅ Can view meetings (cached)
  - ✅ New actions queued for when online

#### Test Case UJ10.2: Offline to Online Transition
- **Precondition**: App used offline, actions queued
- **Steps**:
  1. Use app offline
  2. Perform actions (send message, etc.)
  3. Turn network back on
- **Expected Results**:
  - ✅ App detects network connection
  - ✅ Queued actions synced
  - ✅ Data synchronized with Firebase
  - ✅ All changes applied

#### Test Case UJ10.3: Firebase Connection Failure
- **Precondition**: Firebase configured but connection fails
- **Steps**:
  1. Simulate Firebase connection failure
  2. Perform actions (create profile, send message, etc.)
- **Expected Results**:
  - ✅ App continues to work
  - ✅ Data saved locally
  - ✅ Error logged (not shown to user)
  - ✅ Graceful degradation
  - ✅ Data syncs when connection restored

### Phase 2: Data Validation

#### Test Case UJ10.4: Invalid Data Handling
- **Precondition**: Various screens
- **Steps**:
  1. Try to enter invalid data (too long, special characters, etc.)
- **Expected Results**:
  - ✅ Validation errors shown
  - ✅ Invalid data rejected
  - ✅ User-friendly error messages
  - ✅ No crashes
  - ✅ App remains stable

#### Test Case UJ10.5: Empty Data Handling
- **Precondition**: Various screens
- **Steps**:
  1. Try to submit forms with empty required fields
- **Expected Results**:
  - ✅ Validation errors shown
  - ✅ Required fields highlighted
  - ✅ Form not submitted
  - ✅ User can correct and retry

### Phase 3: Concurrent Actions

#### Test Case UJ10.6: Rapid Navigation
- **Precondition**: App running
- **Steps**:
  1. Rapidly switch between tabs
  2. Rapidly navigate screens
  3. Perform multiple actions quickly
- **Expected Results**:
  - ✅ No crashes
  - ✅ No infinite loops
  - ✅ All actions complete correctly
  - ✅ UI remains responsive
  - ✅ No memory leaks

#### Test Case UJ10.7: Multiple Messages Simultaneously
- **Precondition**: Multiple conversations
- **Steps**:
  1. Send messages in multiple conversations quickly
- **Expected Results**:
  - ✅ All messages sent successfully
  - ✅ No message loss
  - ✅ Conversations update correctly
  - ✅ No race conditions

---

## USER JOURNEY 11: NOTIFICATION SYSTEM

### Phase 1: Notification Permissions

#### Test Case UJ11.1: Grant Notification Permissions
- **Precondition**: First time using meeting features
- **Steps**:
  1. Accept a meeting
  2. Grant notification permissions when prompted
- **Expected Results**:
  - ✅ Permission request shown
  - ✅ Permission granted
  - ✅ Notifications scheduled successfully
  - ✅ User can receive reminders

#### Test Case UJ11.2: Deny Notification Permissions
- **Precondition**: First time using meeting features
- **Steps**:
  1. Accept a meeting
  2. Deny notification permissions when prompted
- **Expected Results**:
  - ✅ Permission request shown
  - ✅ Permission denied
  - ✅ Meeting still accepted
  - ✅ No notifications scheduled
  - ✅ Warning logged (not shown to user)

### Phase 2: Notification Delivery

#### Test Case UJ11.3: Notification Appears on Lock Screen
- **Precondition**: Meeting reminder scheduled
- **Steps**:
  1. Lock device
  2. Wait for reminder time
- **Expected Results**:
  - ✅ Notification appears on lock screen
  - ✅ Notification content visible
  - ✅ Can tap to open app

#### Test Case UJ11.4: Notification Appears When App Open
- **Precondition**: Meeting reminder scheduled, app open
- **Steps**:
  1. Keep app open
  2. Wait for reminder time
- **Expected Results**:
  - ✅ Notification appears
  - ✅ Notification content visible
  - ✅ App continues to function
  - ✅ Can tap notification to navigate to meeting

#### Test Case UJ11.5: Notification Tap Opens App
- **Precondition**: Notification received
- **Steps**:
  1. Tap on notification
- **Expected Results**:
  - ✅ App opens (if closed)
  - ✅ Navigates to relevant screen (meeting details)
  - ✅ Meeting information displayed
  - ✅ User can take action (view, add to calendar, etc.)

---

## USER JOURNEY 12: DATA PERSISTENCE & SYNC

### Phase 1: Data Persistence

#### Test Case UJ12.1: Data Persists After App Close
- **Precondition**: User has created profile, sent requests, messages, scheduled meetings
- **Steps**:
  1. Close app completely
  2. Reopen app
- **Expected Results**:
  - ✅ All data persists:
    - Profile
    - Requests
    - Messages
    - Meetings
    - Connections
  - ✅ Data loaded automatically
  - ✅ No data loss

#### Test Case UJ12.2: Data Syncs Across Devices (Firebase)
- **Precondition**: Firebase configured, user logged in on Device A
- **Steps**:
  1. Create profile, send messages, schedule meetings on Device A
  2. Log in on Device B
- **Expected Results**:
  - ✅ All data synced to Device B
  - ✅ Profile visible
  - ✅ Messages visible
  - ✅ Meetings visible
  - ✅ Connections visible
  - ✅ Data consistent across devices

### Phase 2: Data Migration

#### Test Case UJ12.3: Local to Firebase Migration
- **Precondition**: User has local-only data, Firebase configured
- **Steps**:
  1. App detects Firebase configuration
  2. Data migration occurs
- **Expected Results**:
  - ✅ Local data migrated to Firebase
  - ✅ Data preserved
  - ✅ No data loss
  - ✅ Migration logged
  - ✅ User not interrupted

---

## TEST EXECUTION PRIORITY

### Critical Path (Must Test First)
1. **UJ1.4**: Sign Up with Valid Information
2. **UJ1.10**: Create Complete Profile
3. **UJ1.13**: Log In After Profile Creation
4. **UJ2.1**: View Discover Screen
5. **UJ2.5**: View Profile Details
6. **UJ3.1**: Send Mentor Request
7. **UJ3.6**: Accept Mentor Request
8. **UJ3.11**: View My Mentors
9. **UJ5.3**: Send First Message
10. **UJ6.2**: Schedule Virtual Meeting
11. **UJ6.7**: Accept Meeting Request
12. **UJ6.17-19**: Receive All Three Meeting Reminders

### High Priority (Test After Critical Path)
- All other user journey test cases
- Multi-user interactions
- Calendar integration
- Notification system

### Medium Priority (Test for Edge Cases)
- Error scenarios
- Offline mode
- Data validation
- Concurrent actions

---

## TEST ENVIRONMENT SETUP

### Required Test Accounts
1. **Test User A**: `t0@example.com` / `password123`
2. **Test User B**: `t1@example.com` / `password123`
3. **New Test Users**: Create as needed for specific scenarios

### Required Test Data
- Test profiles for both users
- Test invitation codes
- Test meeting requests
- Test messages

### Required Permissions
- Calendar permissions (for calendar integration tests)
- Notification permissions (for reminder tests)
- Network access (for Firebase sync tests)

### Test Devices
- iOS device (for iOS-specific tests)
- Android device (for Android-specific tests)
- Or use simulators/emulators

---

## NOTES

1. **Real-Time Updates**: Some features (like messaging) require Firebase for real-time updates. Tests should account for both Firebase-enabled and local-only modes.

2. **Notification Timing**: Meeting reminder tests require waiting for actual notification times. Consider using test time manipulation or separate integration tests.

3. **Calendar Integration**: Calendar integration tests require actual device permissions and may need manual verification on physical devices.

4. **Multi-User Scenarios**: Some tests require two separate user accounts. Use test accounts or create accounts as needed.

5. **Data Cleanup**: After testing, consider cleaning up test data to avoid affecting subsequent tests.

---

## TEST TRACKING

### Test Status Legend
- ✅ **Passed**: Test executed and passed
- ❌ **Failed**: Test executed and failed
- ⏸️ **Skipped**: Test skipped (not applicable or blocked)
- 🔄 **In Progress**: Test currently being executed
- ⏳ **Pending**: Test not yet executed

### Test Execution Log
- Date: _______________
- Tester: _______________
- Environment: _______________
- Results: _______________

---

**End of End-to-End User Journey Test Plan**
