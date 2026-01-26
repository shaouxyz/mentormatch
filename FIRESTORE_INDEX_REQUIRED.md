# Firestore Index Required for Conversations Query

## Issue
The query `where('participants', 'array-contains', userEmail)` with `orderBy('updatedAt', 'desc')` requires a composite index in Firestore.

## Error Message
If you see an error like:
```
The query requires an index. You can create it here: https://console.firebase.google.com/...
```

## Solution

### Option 1: Create Index via Error Link
1. When you run the query, Firestore will show an error with a link
2. Click the link to automatically create the required index
3. Wait for the index to build (usually takes a few minutes)

### Option 2: Create Index Manually
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Go to **Firestore Database** → **Indexes** tab
4. Click **"Create Index"**
5. Set up the index:
   - **Collection ID**: `conversations`
   - **Fields to index**:
     - Field: `participants` | Type: `Arrays` | Order: `Ascending`
     - Field: `updatedAt` | Type: `String` | Order: `Descending`
   - **Query scope**: `Collection`
6. Click **"Create"**

### Option 3: Simplify Query (Temporary Fix)
If you want to avoid the index requirement temporarily, you can:
1. Remove the `orderBy('updatedAt', 'desc')` from the query
2. Sort the results in JavaScript after fetching

## After Creating Index
1. Wait for the index to finish building (check status in Firebase Console)
2. Restart your app
3. The query should work without permission errors
