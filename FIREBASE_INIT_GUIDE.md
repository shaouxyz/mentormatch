# Firebase Initialization Guide

## Answer: Run `firebase init` in the `cmn` directory

You should run `firebase init` **in your current project directory** (`c:\Proj\cmn`). This is where your `firestore.indexes.json` file is located.

## Quick Setup Steps

### Step 1: Navigate to project directory
```bash
cd c:\Proj\cmn
```

### Step 2: Login to Firebase (if not already)
```bash
firebase login
```

### Step 3: Initialize Firebase
```bash
firebase init
```

### Step 4: Select what to initialize

When prompted, select:
- ✅ **Firestore** (for indexes and rules)
- ❌ **Hosting** (not needed for this project)
- ❌ **Functions** (not needed for this project)
- ❌ **Storage** (not needed for this project)
- ❌ **Other features** (skip unless you need them)

### Step 5: Select project

When asked "Please select an option", choose:
- **Use an existing project**
- Select: **mentormatch-94ecc**

### Step 6: Configure Firestore

When asked about Firestore:
- **What file should be used for Firestore indexes?** → `firestore.indexes.json` (already exists!)
- **What file should be used for Firestore rules?** → You can create `firestore.rules` or skip for now

## After Initialization

After `firebase init` completes, you'll have:
- `firebase.json` - Firebase configuration file
- `.firebaserc` - Project configuration (contains project ID)

## Then Deploy Indexes

Once initialized, you can deploy the indexes:

```bash
firebase deploy --only firestore:indexes
```

## Alternative: Minimal Setup (If you only need indexes)

If you only want to deploy indexes without full initialization, you can create the files manually:

### Create `.firebaserc`:
```json
{
  "projects": {
    "default": "mentormatch-94ecc"
  }
}
```

### Create `firebase.json`:
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

Then you can deploy:
```bash
firebase deploy --only firestore:indexes
```

## Verification

After initialization, verify:
```bash
# Check current project
firebase use

# List projects
firebase projects:list

# Check if files exist
dir firebase.json
dir .firebaserc
```

## Troubleshooting

### "Firebase CLI not found"
Install it first:
```bash
npm install -g firebase-tools
```

### "Not logged in"
Login first:
```bash
firebase login
```

### "Project not found"
Make sure you have access to the project:
```bash
firebase projects:list
```

If the project doesn't appear, you may need to be added as a collaborator in Firebase Console.

## Files Created by `firebase init`

- `firebase.json` - Main configuration
- `.firebaserc` - Project selection (contains project ID)
- `firestore.rules` - Security rules (if you choose to set it up)
- `.firebaserc` and `firebase.json` should be committed to git (but not `firestore.rules` if it contains sensitive info)

## Next Steps

1. ✅ Run `firebase init` in `c:\Proj\cmn`
2. ✅ Select Firestore and project `mentormatch-94ecc`
3. ✅ Deploy indexes: `firebase deploy --only firestore:indexes`
4. ✅ Verify in Firebase Console that indexes are building
