# Create All Firestore Indexes

This guide shows you how to create all required Firestore indexes using the Firebase CLI.

## Prerequisites

1. **Firebase CLI installed**: If not installed, run:
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project initialized**: Make sure you're logged in and have access to the project:
   ```bash
   firebase login
   firebase use mentormatch-94ecc
   ```

## Method 1: Deploy Indexes Using Firebase CLI (Recommended)

### Step 1: Deploy the indexes file

Run this command from the project root:

```bash
firebase deploy --only firestore:indexes
```

This will:
- Read the `firestore.indexes.json` file
- Create all 12 indexes in your Firestore database
- Show you the status of each index creation

### Step 2: Monitor Index Building

After deployment, you can check the status:

1. **Via Firebase Console**:
   - Go to https://console.firebase.google.com/
   - Select project: **mentormatch-94ecc**
   - Navigate to **Firestore Database** → **Indexes** tab
   - You'll see all indexes with status:
     - 🟡 **Building** - Index is being created (takes 1-5 minutes)
     - 🟢 **Enabled** - Index is ready to use

2. **Via Firebase CLI**:
   ```bash
   firebase firestore:indexes
   ```

## Method 2: Create Indexes Manually (Alternative)

If you prefer to create indexes one by one through the Firebase Console:

1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Select your project: **mentormatch-94ecc**
3. Go to **Firestore Database** → **Indexes** tab
4. Click **"Create Index"** button
5. For each index, configure:
   - **Collection ID**: (e.g., `mentorshipRequests`, `meetings`, etc.)
   - **Fields**: Add fields as specified in `FIRESTORE_ALL_INDEXES_NEEDED.md`
   - **Query scope**: `Collection`
6. Click **"Create"**
7. Wait for each index to build

## What Gets Created

The `firestore.indexes.json` file contains **12 composite indexes**:

### mentorshipRequests (4 indexes)
1. `requesterEmail` + `createdAt` (desc)
2. `mentorEmail` + `createdAt` (desc)
3. `requesterEmail` + `status` + `createdAt` (desc)
4. `mentorEmail` + `status` + `createdAt` (desc)

### meetings (3 indexes)
5. `organizerEmail` + `date` (asc)
6. `participantEmail` + `date` (asc)
7. `participantEmail` + `status` + `createdAt` (desc)

### messages (2 indexes)
8. `conversationId` + `createdAt` (desc)
9. `conversationId` + `createdAt` (asc)

### conversations (1 index)
10. `participants` (array-contains) + `updatedAt` (desc)

### profiles (1 index)
11. `expertise` + `expertiseYears` (desc)

### inbox (1 index)
12. `recipientEmail` + `createdAt` (desc)

## Verification

After deployment, verify all indexes are created:

```bash
# List all indexes
firebase firestore:indexes

# Or check in Firebase Console
# Firestore Database → Indexes tab
```

All indexes should show status **"Enabled"** (green checkmark) before they can be used.

## Troubleshooting

### Error: "Project not found"
Make sure you're using the correct project:
```bash
firebase use mentormatch-94ecc
firebase projects:list  # Verify project exists
```

### Error: "Permission denied"
Make sure you're logged in and have admin access:
```bash
firebase login
firebase login:list  # Verify you're logged in
```

### Indexes stuck in "Building" status
- Indexes typically build in 1-5 minutes
- For large collections, it may take longer
- Wait and check again in a few minutes
- If stuck for >30 minutes, check Firebase Console for errors

### Index already exists
If an index already exists, Firebase will skip it and continue with others. This is normal.

## After Indexes Are Created

1. **Restart your app** to clear any cached errors
2. **Check logs** - you should see:
   - ✅ "Requests for user retrieved from Firebase"
   - ✅ "Meetings retrieved from Firestore"
   - ✅ "Messages retrieved"
   - ✅ No index errors

3. **Test the app** - all Firebase queries should now work without falling back to local storage

## Notes

- Index creation is **free** but counts towards Firestore quotas
- Indexes are **permanent** until deleted (they won't be removed automatically)
- You can delete unused indexes from Firebase Console if needed
- The `__name__` field is automatically added by Firestore (don't include it in the JSON)
