# Complete List of Required Firestore Indexes

## Overview
This document lists ALL Firestore composite indexes required by the application. Composite indexes are needed when queries combine `where()` filters with `orderBy()` on different fields, or use multiple `where()` clauses with `orderBy()`.

## Indexes by Collection

### 1. mentorshipRequests Collection

#### Index 1: requesterEmail + createdAt
**Query**: `where('requesterEmail', '==', userEmail)` + `orderBy('createdAt', 'desc')`  
**File**: `services/firebaseRequestService.ts` (line 125-128)  
**Function**: `getFirebaseRequestsBySender()`  
**Fields**:
- `requesterEmail` | Type: `String` | Order: `Ascending`
- `createdAt` | Type: `String` | Order: `Descending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added)

**Status**: ⚠️ **MISSING** (causing errors in logs)

---

#### Index 2: mentorEmail + createdAt
**Query**: `where('mentorEmail', '==', mentorEmail)` + `orderBy('createdAt', 'desc')`  
**File**: `services/firebaseRequestService.ts` (line 152-155)  
**Function**: `getFirebaseRequestsByMentor()`  
**Fields**:
- `mentorEmail` | Type: `String` | Order: `Ascending`
- `createdAt` | Type: `String` | Order: `Descending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added)

**Status**: ⚠️ **MISSING** (causing errors in logs)

---

#### Index 3: requesterEmail + status + createdAt (Composite)
**Query**: `where('requesterEmail', '==', userEmail)` + `where('status', '==', status)` + `orderBy('createdAt', 'desc')`  
**File**: `services/firebaseRequestService.ts` (line 204-208)  
**Function**: `getFirebaseRequestsByStatus()`  
**Fields**:
- `requesterEmail` | Type: `String` | Order: `Ascending`
- `status` | Type: `String` | Order: `Ascending`
- `createdAt` | Type: `String` | Order: `Descending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added)

**Status**: ⚠️ **MISSING** (will cause errors when querying by status)

---

#### Index 4: mentorEmail + status + createdAt (Composite)
**Query**: `where('mentorEmail', '==', userEmail)` + `where('status', '==', status)` + `orderBy('createdAt', 'desc')`  
**File**: `services/firebaseRequestService.ts` (line 211-215)  
**Function**: `getFirebaseRequestsByStatus()`  
**Fields**:
- `mentorEmail` | Type: `String` | Order: `Ascending`
- `status` | Type: `String` | Order: `Ascending`
- `createdAt` | Type: `String` | Order: `Descending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added)

**Status**: ⚠️ **MISSING** (will cause errors when querying by status)

---

### 2. meetings Collection

#### Index 1: organizerEmail + date
**Query**: `where('organizerEmail', '==', userEmail)` + `orderBy('date', 'asc')`  
**File**: `services/firebaseMeetingService.ts` (line 162-165)  
**Function**: `getUserMeetings()`  
**Fields**:
- `organizerEmail` | Type: `String` | Order: `Ascending`
- `date` | Type: `String` | Order: `Ascending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added)

**Status**: ⚠️ **MISSING** (causing errors in logs - you have the link!)

---

#### Index 2: participantEmail + date
**Query**: `where('participantEmail', '==', userEmail)` + `orderBy('date', 'asc')`  
**File**: `services/firebaseMeetingService.ts` (line 169-172)  
**Function**: `getUserMeetings()`  
**Fields**:
- `participantEmail` | Type: `String` | Order: `Ascending`
- `date` | Type: `String` | Order: `Ascending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added)

**Status**: ⚠️ **MISSING** (will cause errors when querying participant meetings)

---

#### Index 3: participantEmail + status + createdAt (Composite)
**Query**: `where('participantEmail', '==', userEmail)` + `where('status', '==', 'pending')` + `orderBy('createdAt', 'desc')`  
**File**: `services/firebaseMeetingService.ts` (line 213-217)  
**Function**: `getPendingMeetingRequests()`  
**Fields**:
- `participantEmail` | Type: `String` | Order: `Ascending`
- `status` | Type: `String` | Order: `Ascending`
- `createdAt` | Type: `String` | Order: `Descending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added)

**Status**: ⚠️ **MISSING** (will cause errors when querying pending meetings)

---

### 3. messages Collection

#### Index 1: conversationId + createdAt (Descending)
**Query**: `where('conversationId', '==', conversationId)` + `orderBy('createdAt', 'desc')`  
**File**: `services/firebaseMessageService.ts` (line 144-147)  
**Function**: `getMessages()`  
**Fields**:
- `conversationId` | Type: `String` | Order: `Ascending`
- `createdAt` | Type: `String` | Order: `Descending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added)

**Status**: ⚠️ **MISSING** (will cause errors when loading messages)

---

#### Index 2: conversationId + createdAt (Ascending)
**Query**: `where('conversationId', '==', conversationId)` + `orderBy('createdAt', 'asc')`  
**File**: `services/firebaseMessageService.ts` (line 181-184)  
**Function**: `subscribeToMessages()`  
**Fields**:
- `conversationId` | Type: `String` | Order: `Ascending`
- `createdAt` | Type: `String` | Order: `Ascending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added)

**Status**: ⚠️ **MISSING** (will cause errors in real-time message subscriptions)

---

### 4. conversations Collection

#### Index 1: participants (array-contains) + updatedAt
**Query**: `where('participants', 'array-contains', userEmail)` + `orderBy('updatedAt', 'desc')`  
**File**: `services/firebaseMessageService.ts` (line 218-221)  
**Function**: `getUserConversations()`  
**Fields**:
- `participants` | Type: `Arrays` | Order: `Ascending`
- `updatedAt` | Type: `String` | Order: `Descending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added)

**Status**: ✅ **ALREADY DOCUMENTED** (see `CREATE_FIRESTORE_INDEX.md`)

---

### 5. profiles Collection

#### Index 1: expertise + expertiseYears
**Query**: `where('expertise', '==', expertise)` + `orderBy('expertiseYears', 'desc')`  
**File**: `services/firebaseProfileService.ts` (line 185-188)  
**Function**: `getFirebaseProfilesByExpertise()`  
**Fields**:
- `expertise` | Type: `String` | Order: `Ascending`
- `expertiseYears` | Type: `Number` | Order: `Descending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added)

**Status**: ⚠️ **MISSING** (will cause errors when searching profiles by expertise)

---

### 6. inbox Collection (if used)

#### Index 1: recipientEmail + createdAt
**Query**: `where('recipientEmail', '==', userEmail)` + `orderBy('createdAt', 'desc')`  
**File**: `services/inboxService.ts` (line 138-141)  
**Function**: Used for inbox notifications  
**Fields**:
- `recipientEmail` | Type: `String` | Order: `Ascending`
- `createdAt` | Type: `String` | Order: `Descending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added)

**Status**: ⚠️ **MISSING** (will cause errors if inbox service is used)

---

## Summary

### Currently Causing Errors (High Priority)
1. ✅ **mentorshipRequests**: `requesterEmail` + `createdAt`
2. ✅ **mentorshipRequests**: `mentorEmail` + `createdAt`
3. ✅ **meetings**: `organizerEmail` + `date`

### Will Cause Errors Soon (Medium Priority)
4. ⚠️ **meetings**: `participantEmail` + `date`
5. ⚠️ **meetings**: `participantEmail` + `status` + `createdAt`
6. ⚠️ **mentorshipRequests**: `requesterEmail` + `status` + `createdAt`
7. ⚠️ **mentorshipRequests**: `mentorEmail` + `status` + `createdAt`
8. ⚠️ **messages**: `conversationId` + `createdAt` (both ascending and descending)
9. ⚠️ **profiles**: `expertise` + `expertiseYears`
10. ⚠️ **inbox**: `recipientEmail` + `createdAt` (if inbox service is used)

### Already Documented
11. ✅ **conversations**: `participants` (array-contains) + `updatedAt`

## Quick Fix Instructions

### Option 1: Use Error Links (Easiest)
When you run queries, Firestore will show errors with direct links to create indexes:
1. Copy the link from the error message
2. Open it in your browser
3. Click "Create Index"
4. Wait for the index to build (1-5 minutes)

### Option 2: Create Manually
1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Select your project: **mentormatch-94ecc**
3. Go to **Firestore Database** → **Indexes** tab
4. Click **"Create Index"** button
5. Configure each index as described above
6. Click **"Create"**
7. Wait for the index to build

## Index Building Status

After creating an index:
- Status will show **"Building"** (yellow) - index is being created
- Status will show **"Enabled"** (green) - index is ready to use
- Building usually takes 1-5 minutes, but can take longer for large collections

## Verification

After creating all indexes:

1. **Check index status** in Firebase Console → Firestore → Indexes
2. Wait until all indexes show **"Enabled"** (green checkmark)
3. **Restart your app**
4. **Check logs** - you should see:
   - ✅ "Requests for user retrieved from Firebase"
   - ✅ "Meetings retrieved from Firestore"
   - ✅ "Messages retrieved"
   - ✅ "Conversations retrieved"
   - ✅ No index errors

## Notes

- The `__name__` field is automatically added by Firestore for composite indexes
- Indexes are required when using `where()` + `orderBy()` on different fields
- Single-field queries don't require indexes
- Indexes are free but count towards Firestore quotas
- The app gracefully falls back to local storage when indexes are missing
