# Firestore Indexes Required

## Overview
The app requires several composite indexes in Firestore to support efficient queries. When these indexes are missing, you'll see errors like:
```
The query requires an index. You can create it here: https://console.firebase.google.com/...
```

## Required Indexes

### 1. mentorshipRequests Collection

#### Index 1: requesterEmail + createdAt
**Purpose**: Query requests sent by a user, sorted by creation date

**Fields**:
- `requesterEmail` | Type: `String` | Order: `Ascending`
- `createdAt` | Type: `String` | Order: `Descending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added by Firestore)

**Used by**: `getFirebaseRequestsBySender()` in `services/firebaseRequestService.ts` (line 122-144)

**Error Link Pattern**:
```
https://console.firebase.google.com/v1/r/project/mentormatch-94ecc/firestore/indexes?create_composite=...requesterEmail...createdAt...
```

#### Index 2: mentorEmail + createdAt
**Purpose**: Query requests received by a user (as mentor), sorted by creation date

**Fields**:
- `mentorEmail` | Type: `String` | Order: `Ascending`
- `createdAt` | Type: `String` | Order: `Descending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added by Firestore)

**Used by**: `getFirebaseRequestsByMentor()` in `services/firebaseRequestService.ts` (line 149-171)

**Error Link Pattern**:
```
https://console.firebase.google.com/v1/r/project/mentormatch-94ecc/firestore/indexes?create_composite=...mentorEmail...createdAt...
```

#### Index 3: requesterEmail + status + createdAt (Composite)
**Purpose**: Query requests by sender and status, sorted by creation date

**Fields**:
- `requesterEmail` | Type: `String` | Order: `Ascending`
- `status` | Type: `String` | Order: `Ascending`
- `createdAt` | Type: `String` | Order: `Descending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added by Firestore)

**Used by**: `getFirebaseRequestsByStatus()` in `services/firebaseRequestService.ts` (line 196-244)

#### Index 4: mentorEmail + status + createdAt (Composite)
**Purpose**: Query requests by mentor and status, sorted by creation date

**Fields**:
- `mentorEmail` | Type: `String` | Order: `Ascending`
- `status` | Type: `String` | Order: `Ascending`
- `createdAt` | Type: `String` | Order: `Descending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added by Firestore)

**Used by**: `getFirebaseRequestsByStatus()` in `services/firebaseRequestService.ts` (line 196-244)

### 2. meetings Collection

#### Index 1: organizerEmail + date
**Purpose**: Query meetings organized by a user, sorted by date

**Fields**:
- `organizerEmail` | Type: `String` | Order: `Ascending`
- `date` | Type: `String` | Order: `Ascending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added by Firestore)

**Used by**: `getUserMeetings()` in `services/firebaseMeetingService.ts` (line 156-203)

**Error Link Pattern**:
```
https://console.firebase.google.com/v1/r/project/mentormatch-94ecc/firestore/indexes?create_composite=...organizerEmail...date...
```

#### Index 2: participantEmail + date
**Purpose**: Query meetings where user is a participant, sorted by date

**Fields**:
- `participantEmail` | Type: `String` | Order: `Ascending`
- `date` | Type: `String` | Order: `Ascending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added by Firestore)

**Used by**: `getUserMeetings()` in `services/firebaseMeetingService.ts` (line 156-203)

#### Index 3: participantEmail + status + createdAt (Composite)
**Purpose**: Query pending meeting requests for a user, sorted by creation date

**Fields**:
- `participantEmail` | Type: `String` | Order: `Ascending`
- `status` | Type: `String` | Order: `Ascending`
- `createdAt` | Type: `String` | Order: `Descending`
- `__name__` | Type: `String` | Order: `Ascending` (auto-added by Firestore)

**Used by**: `getPendingMeetingRequests()` in `services/firebaseMeetingService.ts` (line 208-233)

## Quick Fix: Use Error Links

The easiest way to create these indexes is to use the links provided in the error messages:

1. **Copy the link** from the error message in your terminal/logs
2. **Open the link** in your browser
3. **Click "Create Index"** button
4. **Wait** for the index to build (usually 1-5 minutes)
5. **Check status** in Firebase Console → Firestore → Indexes tab

## Manual Creation

If you prefer to create indexes manually:

1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Select your project: **mentormatch-94ecc**
3. Go to **Firestore Database** → **Indexes** tab
4. Click **"Create Index"** button
5. Configure each index as described above
6. Click **"Create"**
7. Wait for the index to build (status will show "Building" then "Enabled")

## Index Building Status

After creating an index:
- Status will show **"Building"** (yellow) - index is being created
- Status will show **"Enabled"** (green) - index is ready to use
- Building usually takes 1-5 minutes, but can take longer for large collections

## Current Status

Based on the error logs, the following indexes are currently missing:

1. ✅ **mentorshipRequests**: `requesterEmail` + `createdAt` + `__name__`
2. ✅ **mentorshipRequests**: `mentorEmail` + `createdAt` + `__name__`
3. ✅ **meetings**: `organizerEmail` + `date` + `__name__`

## Fallback Behavior

The app is designed to gracefully handle missing indexes:
- When a Firebase query fails due to a missing index, it falls back to local storage
- You'll see warnings in the logs: `"Failed to get requests from Firebase, using local"`
- The app continues to work, but data won't sync with Firebase until indexes are created

## Verification

After creating all indexes:

1. **Check index status** in Firebase Console → Firestore → Indexes
2. Wait until all indexes show **"Enabled"** (green checkmark)
3. **Restart your app**
4. **Check logs** - you should see:
   - ✅ "Requests for user retrieved from Firebase"
   - ✅ "Meetings retrieved from Firestore"
   - ✅ No index errors

## Notes

- The `__name__` field is automatically added by Firestore for composite indexes
- Indexes are required when using `where()` + `orderBy()` on different fields
- Single-field queries don't require indexes
- Indexes are free but count towards Firestore quotas
