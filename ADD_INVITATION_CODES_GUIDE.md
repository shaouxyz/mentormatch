# Add Invitation Codes to Firestore

## Problem

The codes in `invitation_codes.txt` are just text strings. They need to be added to Firestore so the app can validate them.

**You don't need to rebuild the APK** - codes are stored in Firestore, not in the app code.

## Solution Options

### Option 1: Use Existing Script (Recommended)

The existing script `scripts/generateInitialInvitationCodes.ts` generates codes AND adds them to Firestore. Run it:

```bash
npx ts-node scripts/generateInitialInvitationCodes.ts
```

This will:
- Generate 100 new codes
- Add them to Firestore
- Add them to `shaouxyz@gmail.com`'s inbox

**Note**: This generates NEW codes, not the ones from `invitation_codes.txt`.

### Option 2: Add Codes Manually via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** > **Data**
4. Navigate to `invitationCodes` collection
5. For each code from `invitation_codes.txt`:
   - Click "Add document"
   - Document ID: Auto-generate (leave empty)
   - Add fields:
     ```
     code: SWQYZGTV (the actual code)
     createdBy: shaouxyz@gmail.com
     isUsed: false
     createdAt: 2026-01-26T00:00:00.000Z (current timestamp)
     ```
   - Click "Save"

**This is tedious for 100 codes**, but it works.

### Option 3: Use Firebase Admin SDK Script

Create a script using Firebase Admin SDK (requires service account key):

```typescript
// scripts/addCodesWithAdmin.ts
import * as admin from 'firebase-admin';
import * as fs from 'fs';

// Initialize with service account
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Read codes from file and add to Firestore
// (Full implementation needed)
```

### Option 4: Add Codes via App (If You Have Access)

If you can log in as `shaouxyz@gmail.com`:
1. The app should have codes in the inbox
2. Or use the app to generate new codes

## Why Codes from File Don't Work

The codes in `invitation_codes.txt` are just text. The app validates codes by:
1. Checking Firestore `invitationCodes` collection
2. Looking for a document where `code` field matches
3. Checking if `isUsed` is `false`

Since the codes aren't in Firestore, validation fails.

## Quick Fix: Use the Existing Script

The easiest solution is to run:

```bash
npx ts-node scripts/generateInitialInvitationCodes.ts
```

This will create 100 NEW codes in Firestore that you can use immediately. The codes from the file can be kept as a backup, but you'd need to add them manually or via a script.

## Verification

After adding codes to Firestore:
1. Try signing up with one of the codes
2. It should work without rebuilding the APK
3. Codes are stored in Firestore, accessible from any device

## Next Steps

1. ✅ Run `generateInitialInvitationCodes.ts` to add codes to Firestore
2. ✅ Test signup with one of the new codes
3. ✅ Codes should work in the APK without rebuilding
