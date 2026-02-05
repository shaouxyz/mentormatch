# Correct Firebase Init - Firestore Only

## What Happened

You selected **Data Connect** during `firebase init`, but you only need **Firestore** for indexes. Data Connect is a newer feature that's not needed for this project.

## Solution: Re-run with Only Firestore

Run `firebase init` again, but this time:

### Step 1: Run firebase init
```bash
firebase init
```

### Step 2: Select Features
When asked "Which Firebase features do you want to set up?", use:
- **Spacebar** to select/deselect
- **Arrow keys** to navigate
- Select **ONLY**: `Firestore: Configure security rules and indexes files for Firestore`
- **Deselect everything else** (including Data Connect)
- Press **Enter** to confirm

### Step 3: Select Project
- Choose: **Use an existing project**
- Select: **mentormatch-94ecc (mentormatch)**

### Step 4: Configure Firestore
- **What file should be used for Firestore indexes?** 
  - Answer: `firestore.indexes.json` (already exists!)
  
- **What file should be used for Firestore rules?**
  - Answer: `firestore.rules` (or press Enter to skip for now)

### Step 5: Done!
After this, you'll have:
- `firebase.json` - Firebase configuration
- `.firebaserc` - Project configuration

Then deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

## Clean Up (Optional)

If you want to remove the Data Connect files that were created:

```bash
# Remove Data Connect directory (if you don't need it)
rmdir /s dataconnect
```

Or just leave them - they won't hurt anything.

## Visual Guide

When selecting features, it should look like this:

```
✔ Firestore: Configure security rules and indexes files for Firestore
  Data Connect: Set up a Firebase Data Connect service
  Genkit: Setup a new Genkit project with Firebase
  Functions: Configure a Cloud Functions directory
  ...
```

Only Firestore should have a checkmark (✔).
