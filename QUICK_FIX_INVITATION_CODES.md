# Quick Fix: Add Invitation Codes to Firestore

## The Problem

You tried a code from `invitation_codes.txt` but got "invalid code" because:
- ❌ The codes are just text in a file
- ❌ They're NOT in Firestore yet
- ✅ **You don't need to rebuild the APK** - codes are in Firestore, not the app

## Quick Solution (Choose One)

### Option 1: Use Firebase Admin SDK Script (Fastest - 5 minutes)

1. **Get Service Account Key:**
   - Go to Firebase Console > Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` in project root

2. **Install Firebase Admin:**
   ```bash
   npm install firebase-admin
   ```

3. **Run the script:**
   ```bash
   npx ts-node scripts/addCodesAdmin.ts
   ```

This will add all 100 codes from `invitation_codes.txt` to Firestore automatically.

### Option 2: Manual Addition via Firebase Console (Works but Slow)

1. Go to Firebase Console > Firestore Database > Data
2. Click "Start collection" (if `invitationCodes` doesn't exist)
3. Collection ID: `invitationCodes`
4. For each code, click "Add document" and add:
   - `code`: The code (e.g., `SWQYZGTV`)
   - `createdBy`: `shaouxyz@gmail.com`
   - `isUsed`: `false`
   - `createdAt`: Current timestamp

**This is tedious for 100 codes**, but it works.

### Option 3: Generate New Codes (Easiest)

Run the existing script that generates codes AND adds them to Firestore:

```bash
# This requires the app to be running, or use the app's code generation feature
```

## Why Codes Don't Work

The app validates codes by querying Firestore:
```typescript
// Checks Firestore for code
const q = query(codesRef, where('code', '==', code));
```

If the code isn't in Firestore, it returns "invalid code".

## After Adding Codes

1. ✅ Codes are in Firestore
2. ✅ Try signing up with any code from the file
3. ✅ No APK rebuild needed - codes are in the cloud
4. ✅ Codes work immediately

## Recommended: Use Admin SDK Script

The `scripts/addCodesAdmin.ts` script is the fastest way:
- Reads codes from `invitation_codes.txt`
- Adds them all to Firestore automatically
- Takes ~2 minutes for 100 codes
- No manual work needed

Just make sure you have `serviceAccountKey.json` first!
