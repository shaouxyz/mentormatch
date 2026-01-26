# Simple Guide: Add Invitation Codes to Firestore

## Option 1: Use Firebase CLI (Easiest - No Service Account Key Needed)

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase
```bash
firebase login
```

### Step 3: Generate Import File
```bash
npx ts-node scripts/generateFirestoreImportJSON.ts
```

This creates `invitation_codes_firestore.json` with all 100 codes.

### Step 4: Import to Firestore
```bash
firebase firestore:import invitation_codes_firestore.json --collection invitationCodes
```

**Note**: Firebase CLI import might require a specific format. If it doesn't work, use Option 2.

## Option 2: Manual Addition via Firebase Console (Works 100%)

### Step 1: Open Firebase Console
1. Go to https://console.firebase.google.com/
2. Select your project
3. Click **Firestore Database** > **Data**

### Step 2: Create Collection (if needed)
1. Click **"Start collection"** (if `invitationCodes` doesn't exist)
2. Collection ID: `invitationCodes`
3. Click **Next**

### Step 3: Add Codes
For each code, click **"Add document"** and add these fields:

**Field 1:**
- Field name: `code`
- Type: `string`
- Value: `SWQYZGTV` (the actual code)

**Field 2:**
- Field name: `createdBy`
- Type: `string`
- Value: `shaouxyz@gmail.com`

**Field 3:**
- Field name: `isUsed`
- Type: `boolean`
- Value: `false`

**Field 4:**
- Field name: `createdAt`
- Type: `timestamp`
- Value: Click calendar icon and select current date/time

Click **Save**

**Repeat for all 100 codes** (yes, it's tedious, but it works!)

### Step 4: Verify
1. Try signing up with code `SWQYZGTV`
2. It should work!

## Option 3: Use Service Account Key (Fastest - Requires Setup)

### Step 1: Get Service Account Key
1. Firebase Console > Project Settings > Service Accounts
2. Click **"Generate new private key"**
3. Save as `serviceAccountKey.json` in project root

### Step 2: Install Firebase Admin
```bash
npm install firebase-admin
```

### Step 3: Run Script
```bash
npx ts-node scripts/addCodesAdmin.ts
```

This automatically adds all 100 codes in ~2 minutes.

## Quick Reference: Code Format in Firestore

Each document in `invitationCodes` collection should have:
```
code: string (e.g., "SWQYZGTV")
createdBy: string (e.g., "shaouxyz@gmail.com")
isUsed: boolean (false)
createdAt: timestamp (current date/time)
```

## Why Codes Don't Work Yet

The codes in `invitation_codes.txt` are just text. The app checks Firestore:
- ✅ Code exists in Firestore → Valid
- ❌ Code not in Firestore → Invalid

Once you add them to Firestore, they'll work immediately (no APK rebuild needed).

## Recommended: Option 3 (Service Account Key)

If you can get the service account key, Option 3 is fastest:
- ✅ Automatic (no manual work)
- ✅ Fast (~2 minutes for 100 codes)
- ✅ One-time setup

Otherwise, use Option 2 (manual addition) - it's slow but works 100%.
