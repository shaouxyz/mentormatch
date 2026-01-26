# How to Add Invitation Codes to Firestore

## Problem

The codes in `invitation_codes.txt` are just text - they're not in Firestore yet, so the app can't validate them.

**You don't need to rebuild the APK** - codes are stored in Firestore, which the app accesses at runtime.

## Solution: Add Codes to Firestore

### Option 1: Manual Addition via Firebase Console (Works Immediately)

1. **Open Firebase Console:**
   - Go to https://console.firebase.google.com/
   - Select your project (`mentormatch-94ecc`)

2. **Navigate to Firestore:**
   - Click "Firestore Database" in the left menu
   - Click "Data" tab

3. **Add Codes to Collection:**
   - If `invitationCodes` collection doesn't exist, click "Start collection"
   - Collection ID: `invitationCodes`
   - For each code from `invitation_codes.txt`:
     - Click "Add document"
     - Document ID: Leave empty (auto-generate)
     - Add these fields:
       ```
       code (string): SWQYZGTV
       createdBy (string): shaouxyz@gmail.com
       isUsed (boolean): false
       createdAt (timestamp): [Click and select current date/time]
       ```
     - Click "Save"

**Note**: This is tedious for 100 codes, but it works immediately.

### Option 2: Use Firebase Console Import (Faster)

1. **Prepare JSON file:**
   Create a file `invitation_codes_firestore.json` with this format:
   ```json
   [
     {
       "code": "SWQYZGTV",
       "createdBy": "shaouxyz@gmail.com",
       "isUsed": false,
       "createdAt": "2026-01-26T00:00:00.000Z"
     },
     {
       "code": "9LJJCR9U",
       "createdBy": "shaouxyz@gmail.com",
       "isUsed": false,
       "createdAt": "2026-01-26T00:00:00.000Z"
     }
     // ... etc for all 100 codes
   ]
   ```

2. **Use Firebase CLI or Admin SDK:**
   - Install Firebase CLI: `npm install -g firebase-tools`
   - Login: `firebase login`
   - Use Admin SDK script (see below)

### Option 3: Create a Simple Node Script (Recommended)

Since the React Native scripts can't run directly, create a simple Node.js script that uses Firebase Admin SDK:

**Prerequisites:**
1. Download service account key from Firebase Console:
   - Project Settings > Service Accounts > Generate new private key
   - Save as `serviceAccountKey.json` in project root

2. Install Firebase Admin:
   ```bash
   npm install firebase-admin
   ```

3. Create script: `scripts/addCodesAdmin.ts` (see below)

## Quick Script Using Firebase Admin SDK

```typescript
// scripts/addCodesAdmin.ts
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Admin SDK
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const CREATED_BY = 'shaouxyz@gmail.com';

async function addCodes() {
  // Read codes from file
  const codesFile = path.join(__dirname, '../invitation_codes.txt');
  const content = fs.readFileSync(codesFile, 'utf8');
  const lines = content.split('\n');
  
  const codes: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\d+\.\s*(.+)$/);
    if (match) codes.push(match[1].trim());
  }

  console.log(`Adding ${codes.length} codes to Firestore...`);

  for (const code of codes) {
    await db.collection('invitationCodes').add({
      code,
      createdBy: CREATED_BY,
      isUsed: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Added: ${code}`);
  }

  console.log('Done!');
  process.exit(0);
}

addCodes();
```

Run: `npx ts-node scripts/addCodesAdmin.ts`

## Why This Happens

The app validates codes by checking Firestore:
```typescript
// In invitationCodeService.ts
const q = query(codesRef, where('code', '==', code));
const querySnapshot = await getDocs(q);
```

If the code doesn't exist in Firestore, validation fails.

## Verification

After adding codes:
1. Try signing up with code `SWQYZGTV` (or any code from the file)
2. It should work without rebuilding the APK
3. The code will be marked as `isUsed: true` after use

## Alternative: Generate New Codes via Existing Script

If you can't add the codes from the file, you can generate new ones:

1. The app should have a way to generate codes (when accepting mentees)
2. Or use the existing `generateInitialInvitationCodes.ts` script if you can run it from the app context

## Summary

- ❌ Codes in `invitation_codes.txt` are just text - not in Firestore
- ✅ Add codes to Firestore `invitationCodes` collection
- ✅ No need to rebuild APK - codes are in Firestore
- ✅ Use Firebase Console or Admin SDK script
