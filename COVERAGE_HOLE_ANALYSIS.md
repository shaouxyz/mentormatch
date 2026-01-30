# Coverage Hole Analysis

**Generated**: 2026-01-30  
**Current Coverage**: 95.49% statements, 84.63% branches, 96.41% lines, 95.36% functions  
**Target**: 100% for all metrics

## Analysis Methodology

This document analyzes each uncovered statement, branch, and function to identify:
1. **Code Context**: What the code does
2. **Trigger Conditions**: What conditions cause this code to execute
3. **Test Strategy**: How to test this code path
4. **Priority**: Critical, High, Medium, Low

---

## 1. APP SCREENS

### 1.1 Home Tab (`app/(tabs)/home.tsx`)

#### Statement 52 (Line 153) - Profile Validation Failure
- **Code**: `if (!Array.isArray(data)) return false;` - Validation check in safeParseJSON
- **Context**: When local profiles exist but are invalid (not an array)
- **Trigger**: Firebase fails, local storage has invalid profile data (not array)
- **Test Strategy**: Mock Firebase to fail, set invalid profile data (object instead of array) in AsyncStorage
- **Priority**: HIGH

#### Statement 80 (Line 241) - Deduplication Warning
- **Code**: `logger.warn('Current user profile was found after deduplication and removed', ...)`
- **Context**: Current user profile appears in loaded profiles after deduplication
- **Trigger**: `finalFilteredProfiles.length !== uniqueProfiles.length` when current user email exists
- **Test Strategy**: Load profiles including current user, ensure deduplication removes it, verify warning
- **Priority**: MEDIUM

#### Statement 116 (Line 315) - Match Score with No Profile
- **Code**: `if (!currentProfile) return 0;` - Early return in getMatchScore
- **Context**: Match score calculation when current profile is null
- **Trigger**: `getMatchScore` called when `currentProfile` is null/undefined
- **Test Strategy**: Don't set profile, call getMatchScore, verify returns 0
- **Priority**: HIGH

#### Statement 131 (Line 350) - Search Filter Excludes Current User
- **Code**: `if (normalizedCurrentEmail && normalizedProfileEmail === normalizedCurrentEmail) { return false; }`
- **Context**: Search filtering excludes current user's profile
- **Trigger**: Search query matches current user's email, profile filtering executes
- **Test Strategy**: Set current user email, search for that email, verify profile excluded
- **Priority**: HIGH

#### Branch 0 branch 1 (Line ?) - No User Data Early Return
- **Code**: Early return when no user data
- **Context**: Initial load with no user in AsyncStorage
- **Trigger**: `userData` is null/undefined
- **Test Strategy**: Clear AsyncStorage, render component, verify early return
- **Priority**: HIGH

#### Branch 1 branch 1 (Line 74) - Session Refresh Error
- **Code**: Error handler in useFocusEffect callback
- **Context**: Session refresh fails
- **Trigger**: `refreshSession()` throws error
- **Test Strategy**: Mock refreshSession to throw error, trigger focus effect
- **Priority**: MEDIUM

#### Branch 2 branch 1 (Line 86) - Firebase Init Warning
- **Code**: Warning when Firebase initialization fails
- **Context**: Firebase init throws error but app continues
- **Trigger**: `initializeFirebase()` throws error
- **Test Strategy**: Mock initializeFirebase to throw error
- **Priority**: MEDIUM

#### Branch 4 branch 1 (Line 100) - Invalid User Data
- **Code**: `?.email || null` - Fallback when user data is invalid
- **Context**: User data exists but doesn't have valid email
- **Trigger**: `safeParseJSON` returns null for user data
- **Test Strategy**: Set invalid user data in AsyncStorage
- **Priority**: MEDIUM

#### Branch 8 branch 1 (Line 118) - Profile Load Error Warning
- **Code**: Warning when profile load fails
- **Context**: hybridGetProfile throws error, fallback to local
- **Trigger**: `hybridGetProfile` throws error
- **Test Strategy**: Mock hybridGetProfile to throw error
- **Priority**: MEDIUM

#### Branch 9 branch 1 (Line ?) - No Profile Data Fallback
- **Code**: Fallback when no profile data in local storage
- **Context**: Profile load fails, no local profile data
- **Trigger**: `profileData` is null after error
- **Test Strategy**: Mock hybridGetProfile to fail, clear profile from AsyncStorage
- **Priority**: MEDIUM

#### Branch 10 branch 1 (Line ?) - No Current User Email
- **Code**: Skip profile loading when no current user email
- **Context**: User data exists but no email field
- **Trigger**: `currentUserEmail` is null
- **Test Strategy**: Set user data without email field
- **Priority**: MEDIUM

#### Branch 11 branch 1 (Line 145) - Profile Sync Error Warning
- **Code**: Warning when profile sync fails
- **Context**: hybridGetAllProfiles throws error
- **Trigger**: `hybridGetAllProfiles` throws error
- **Test Strategy**: Mock hybridGetAllProfiles to throw error
- **Priority**: HIGH

#### Branch 13 branch 0 (Line 153) - Valid Array Check
- **Code**: `if (!Array.isArray(data)) return false;` - False branch
- **Context**: When data IS an array (validation passes)
- **Trigger**: Local profiles exist and are valid array
- **Test Strategy**: Set valid array of profiles in AsyncStorage
- **Priority**: HIGH

#### Branch 14 branch 1 (Line 158) - Parsed Profiles Fallback
- **Code**: `profilesList = parsed || [];` - When parsed is null/undefined
- **Context**: Validation fails, parsed is null
- **Trigger**: safeParseJSON returns null
- **Test Strategy**: Set invalid profiles, verify fallback to empty array
- **Priority**: MEDIUM

#### Branch 20 branch 0 (Line 240) - No Deduplication Needed
- **Code**: `if (normalizedCurrentUserEmail && finalFilteredProfiles.length !== uniqueProfiles.length)` - False branch
- **Context**: When deduplication doesn't remove any profiles
- **Trigger**: Current user not in profiles, or lengths match
- **Test Strategy**: Load profiles without current user, verify no warning
- **Priority**: MEDIUM

#### Branch 23 branch 1 (Line 270) - Error in loadProfiles
- **Code**: Error handler in loadProfiles catch block
- **Context**: Any error in loadProfiles
- **Trigger**: Any exception in loadProfiles
- **Test Strategy**: Cause error in loadProfiles (e.g., invalid data)
- **Priority**: HIGH

#### Branch 27 branch 1 (Line ?) - Error in onRefresh
- **Code**: Error handling in onRefresh
- **Context**: Error during refresh
- **Trigger**: loadProfiles throws error during refresh
- **Test Strategy**: Mock loadProfiles to throw error, trigger refresh
- **Priority**: MEDIUM

#### Branch 28 branch 0 (Line 315) - Current Profile Exists
- **Code**: `if (!currentProfile) return 0;` - False branch
- **Context**: When current profile exists
- **Trigger**: currentProfile is not null
- **Test Strategy**: Set current profile, call getMatchScore
- **Priority**: HIGH

#### Branch 34 branch 0 (Line 349) - No Current Email in Search
- **Code**: `if (normalizedCurrentEmail && normalizedProfileEmail === normalizedCurrentEmail)` - False branch
- **Context**: When current email doesn't match profile email
- **Trigger**: Search for different email
- **Test Strategy**: Set current user, search for different email
- **Priority**: MEDIUM

#### Branch 40 branch 1 (Line 417) - Location Display
- **Code**: `{item.location && (...)}` - When location exists
- **Context**: Profile has location field
- **Trigger**: Profile object has location property
- **Test Strategy**: Create profile with location, verify display
- **Priority**: MEDIUM

#### Branch 46 branch 0 (Line 513) - No Loading More Footer
- **Code**: `loadingMore && !searchQuery.trim() ? (...) : null` - False branch
- **Context**: When not loading more or search query exists
- **Trigger**: loadingMore is false OR searchQuery is not empty
- **Test Strategy**: Set search query, verify no loading footer
- **Priority**: MEDIUM

#### Branch 47 branch 1 (Line 512) - Loading More Footer
- **Code**: `loadingMore && !searchQuery.trim() ? (...) : null` - True branch
- **Context**: When loading more and no search query
- **Trigger**: loadingMore is true AND searchQuery is empty
- **Test Strategy**: Trigger loadMore, verify footer appears
- **Priority**: MEDIUM

### 1.2 Mentorship Tab (`app/(tabs)/mentorship.tsx`)

#### Statements 16-19 (Lines 74-77) - No User Early Return
- **Code**: `setMentors([]); setMentees([]); setLoading(false); return;`
- **Context**: Early return when no user data
- **Trigger**: `user` is null after parsing
- **Test Strategy**: Clear user from AsyncStorage, render component
- **Priority**: HIGH

#### Statement 29 (Line 93) - Invalid Requests Schema
- **Code**: Validation check in safeParseJSON
- **Context**: Requests data is invalid (not array)
- **Trigger**: Invalid requests data in AsyncStorage
- **Test Strategy**: Set invalid requests data
- **Priority**: MEDIUM

#### Statement 44 (Line 123) - No Requests Data
- **Code**: Early return when no requests
- **Context**: No requests in AsyncStorage
- **Trigger**: `requestsData` is null
- **Test Strategy**: Clear requests from AsyncStorage
- **Priority**: MEDIUM

#### Statement 61 (Line 166) - Profile Loading Error
- **Code**: Error handling in profile loading
- **Context**: hybridGetProfile throws error
- **Trigger**: Mock hybridGetProfile to throw error
- **Test Strategy**: Mock profile loading to fail
- **Priority**: MEDIUM

### 1.3 Messages Tab (`app/(tabs)/messages.tsx`)

#### Statements 22, 24-25 (Lines 60, 65-66) - useFocusEffect and onRefresh
- **Code**: `loadConversations()` in useFocusEffect and onRefresh
- **Context**: Focus effect callback and refresh handler
- **Trigger**: Component focuses or refresh triggered
- **Test Strategy**: Trigger focus effect, trigger refresh
- **Priority**: HIGH

#### Functions 3-4 (Lines 59, 64) - Anonymous Callbacks
- **Code**: useFocusEffect callback and onRefresh function
- **Context**: Callback functions
- **Trigger**: Focus effect and refresh
- **Test Strategy**: Execute callbacks directly or trigger events
- **Priority**: HIGH

### 1.4 Profile Tab (`app/(tabs)/profile.tsx`)

#### Statement 11 (Line 57) - Initial Load Guard
- **Code**: `if (hasLoadedRef.current) return;`
- **Context**: Prevents duplicate loads
- **Trigger**: Component re-renders after initial load
- **Test Strategy**: Render component twice, verify load only once
- **Priority**: MEDIUM

### 1.5 Requests Tab (`app/(tabs)/requests.tsx`)

#### Statement 12 (Line 60) - Loading Guard
- **Code**: `if (isLoadingRef.current) return;`
- **Context**: Prevents concurrent loads
- **Trigger**: loadRequests called while already loading
- **Test Strategy**: Call loadRequests twice rapidly
- **Priority**: MEDIUM

#### Statements 91-94 (Lines 297-303) - Request Rendering Fallback
- **Code**: Fallback logic when userEmail not loaded
- **Context**: Request item rendering with missing userEmail
- **Trigger**: Render request before userEmail is set
- **Test Strategy**: Render with userEmail undefined
- **Priority**: MEDIUM

#### Statements 101, 107 (Lines 366, 379) - Switch Default Cases
- **Code**: Default cases in switch statements
- **Trigger**: Invalid tab value
- **Test Strategy**: Set invalid activeTab value
- **Priority**: LOW

#### Statement 112 (Line 403) - Anonymous Function
- **Code**: Tab press handler
- **Trigger**: Tab button pressed
- **Test Strategy**: Press tab button
- **Priority**: MEDIUM

### 1.6 Meeting Respond (`app/meeting/respond.tsx`)

#### Statement 23 (Line 61) - Meeting Load Error
- **Code**: Error handling when meeting load fails
- **Trigger**: hybridGetMeeting throws error
- **Test Strategy**: Mock hybridGetMeeting to throw error
- **Priority**: HIGH

#### Statements 32, 35, 37 (Lines 83, 93, 109) - Response Error Handling
- **Code**: Error handling in response submission
- **Trigger**: hybridUpdateMeeting or notification scheduling fails
- **Test Strategy**: Mock services to throw errors
- **Priority**: HIGH

### 1.7 Meeting Schedule (`app/meeting/schedule.tsx`)

#### Statements 51-53, 55-57 (Lines 151-153, 158-160) - DateTimePicker Error Handling
- **Code**: Error handlers for date/time picker
- **Trigger**: Picker errors or cancellation
- **Test Strategy**: Trigger picker errors/cancellation
- **Priority**: MEDIUM

### 1.8 Meeting Upcoming (`app/meeting/upcoming.tsx`)

#### Statement 20 (Line 60) - Meeting Load Error
- **Code**: Error handling when meetings load fails
- **Trigger**: hybridGetUpcomingMeetings throws error
- **Test Strategy**: Mock service to throw error
- **Priority**: HIGH

#### Statements 27-28 (Lines 77-78) - Notification Scheduling
- **Code**: Notification scheduling on load
- **Trigger**: Meetings loaded successfully
- **Test Strategy**: Load meetings, verify notifications scheduled
- **Priority**: MEDIUM

### 1.9 Chat Screen (`app/messages/chat.tsx`)

#### Statement 54 (Line 138) - Subscription Error
- **Code**: Error handling in message subscription
- **Trigger**: hybridSubscribeToChat throws error
- **Test Strategy**: Mock subscription to throw error
- **Priority**: HIGH

#### Statement 76 (Line 228) - Send Message Error
- **Code**: Error handler for message sending
- **Trigger**: hybridSendMessage throws error
- **Test Strategy**: Mock sendMessage to throw error
- **Priority**: HIGH

### 1.10 Profile View (`app/profile/view.tsx`)

#### Statement 15 (Line 67) - Profile Load Error
- **Code**: Error handling when profile load fails
- **Trigger**: hybridGetProfile throws error
- **Test Strategy**: Mock profile loading to fail
- **Priority**: HIGH

#### Statements 63, 79, 110-111, 113-114 (Lines 160, 183, 248-249, 254-255) - Contact Info Display
- **Code**: Conditional display of contact information
- **Trigger**: Various connection states
- **Test Strategy**: Test viewing own profile, unmatched, matched
- **Priority**: HIGH

#### Statement 121 (Line 295) - Action Handlers
- **Code**: Navigation and action handlers
- **Trigger**: Button presses
- **Test Strategy**: Press various action buttons
- **Priority**: MEDIUM

### 1.11 Request Respond (`app/request/respond.tsx`)

#### Statement 18 (Line 88) - Request Load Error
- **Code**: Error handling when request load fails
- **Trigger**: Request loading throws error
- **Test Strategy**: Mock request loading to fail
- **Priority**: HIGH

#### Statements 20, 23, 29 (Lines 93, 99, 109) - Response Validation and Errors
- **Code**: Validation and error handling in response
- **Trigger**: Invalid data or service errors
- **Test Strategy**: Test validation failures and service errors
- **Priority**: HIGH

### 1.12 Request Send (`app/request/send.tsx`)

#### Statement 17 (Line 92) - Profile Load Error
- **Code**: Error handling when profile load fails
- **Trigger**: Profile loading throws error
- **Test Strategy**: Mock profile loading to fail
- **Priority**: HIGH

#### Statements 25, 27, 30, 35, 43 (Lines 122, 127, 134, 140, 152) - Request Creation Validation
- **Code**: Validation and error handling
- **Trigger**: Invalid data or service errors
- **Test Strategy**: Test various validation scenarios
- **Priority**: HIGH

#### Statements 57, 67, 70, 88, 103 (Lines 181, 206, 215, 252, 294) - Request Submission Errors
- **Code**: Error handling in request submission
- **Trigger**: Service errors
- **Test Strategy**: Mock services to throw errors
- **Priority**: HIGH

---

## 2. SERVICES

### 2.1 Invitation Code Service (`services/invitationCodeService.ts`)

#### Statements 46, 50-55 (Lines 126, 134-139) - Local Code Fallback
- **Code**: Local code fallback when Firebase query empty
- **Trigger**: Firebase query returns empty, local code exists
- **Test Strategy**: Mock Firebase to return empty, set local unused code
- **Priority**: HIGH

#### Statements 64, 66-69 (Lines 159-164) - Local Code Sync
- **Code**: Sync local code when Firebase code used
- **Trigger**: Code used in Firebase, exists locally
- **Test Strategy**: Set code used in Firebase, verify local sync
- **Priority**: MEDIUM

### 2.2 Meeting Notification Service (`services/meetingNotificationService.ts`)

#### Statement 2 (Line 19) - Notification Handler
- **Code**: Notification handler configuration
- **Trigger**: Service initialization
- **Test Strategy**: Import service, verify handler configured
- **Priority**: LOW

#### Statements 10-11 (Lines 52-53) - Storage Error Handling
- **Code**: Error handling in saveScheduledNotifications
- **Trigger**: AsyncStorage throws error
- **Test Strategy**: Mock AsyncStorage to throw error
- **Priority**: MEDIUM

#### Statements 62, 65, 69 (Lines 235, 243, 254) - Notification Scheduling Edge Cases
- **Code**: Various notification scheduling scenarios
- **Trigger**: Past meetings, no permissions, errors
- **Test Strategy**: Test various scheduling scenarios
- **Priority**: MEDIUM

### 2.3 Hybrid Services

#### hybridMessageService - Multiple Error Handlers
- **Code**: Error handling in message operations
- **Trigger**: Various service errors
- **Test Strategy**: Mock services to throw errors
- **Priority**: HIGH

#### hybridProfileService - Error Branches
- **Code**: Error handling branches
- **Trigger**: Service errors
- **Test Strategy**: Mock services to throw errors
- **Priority**: MEDIUM

### 2.4 Firebase Services

#### firebaseMeetingService - Error Handling
- **Code**: Error handling in Firebase operations
- **Trigger**: Firebase errors
- **Test Strategy**: Mock Firebase to throw errors
- **Priority**: MEDIUM

#### firebaseMessageService - Error Handling
- **Code**: Error handling in message operations
- **Trigger**: Firebase errors
- **Test Strategy**: Mock Firebase to throw errors
- **Priority**: MEDIUM

---

## 3. UTILS

### 3.1 Data Migration (`utils/dataMigration.ts`)

#### Multiple Statements - Migration Error Handling
- **Code**: Error handling in migration process
- **Trigger**: Migration errors at various points
- **Test Strategy**: Mock migration to fail at different points
- **Priority**: MEDIUM

### 3.2 Connection Utils (`utils/connectionUtils.ts`)

#### Statements 6, 22 (Lines 29, 69) - Error Handling
- **Code**: Error handling in connection operations
- **Trigger**: Connection operations fail
- **Test Strategy**: Mock operations to fail
- **Priority**: MEDIUM

### 3.3 Profile Ordering (`utils/profileOrdering.ts`)

#### Statements 18, 53 (Lines 75, 154) - Edge Cases
- **Code**: Edge case handling in ordering
- **Trigger**: Empty profiles, edge case data
- **Test Strategy**: Test with edge case data
- **Priority**: MEDIUM

### 3.4 Test Accounts (`utils/testAccounts.ts`)

#### Multiple Statements - Error Handling
- **Code**: Error handling in test account operations
- **Trigger**: Test account operations fail
- **Test Strategy**: Mock operations to fail
- **Priority**: MEDIUM

---

## 4. TESTING PRIORITY

### Priority 1 (CRITICAL - Must Test)
- Error handling in critical paths (profile loading, authentication)
- Validation failures
- Early returns with no data
- Match score calculation edge cases

### Priority 2 (HIGH - Should Test)
- Service error handling
- Firebase fallback scenarios
- Conditional rendering branches
- Navigation and action handlers

### Priority 3 (MEDIUM - Nice to Have)
- Edge cases in utilities
- Notification scheduling edge cases
- Migration error handling
- Logging and warning paths

### Priority 4 (LOW - Optional)
- Default switch cases
- Handler configuration
- Rare edge cases

---

## 5. TESTING STRATEGY

### For Each Coverage Hole:
1. **Identify the trigger condition** - What causes this code to execute?
2. **Set up test environment** - Mock dependencies, set up data
3. **Execute the trigger** - Call function, trigger event, etc.
4. **Verify the outcome** - Check state, verify logs, verify behavior
5. **Clean up** - Reset mocks, clear state

### Common Patterns:
- **Error Handling**: Mock service to throw error, verify error is caught and handled
- **Early Returns**: Set up condition for early return, verify return happens
- **Conditional Rendering**: Set up condition, verify correct branch renders
- **Validation**: Provide invalid data, verify validation fails correctly
- **Fallbacks**: Cause primary path to fail, verify fallback executes

---

**End of Analysis**
