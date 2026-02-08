# Fix: Can't log in from iPhone (EAS build)

## Why it happens

The EAS build runs on Expo's servers. It **does not** have access to your local `.env` file, so the built app gets Firebase config placeholders (`YOUR_API_KEY`, etc.). The app then thinks Firebase is not configured and only tries **local** login. On a fresh install there are no local users, so login fails.

## Fix: Add Firebase env vars to EAS

Set the same Firebase variables you have in `.env` as **EAS environment variables** so they are available when the app is built.

### Option A: Using EAS CLI (recommended)

From your project root, run these (replace the `...` values with your actual values from `.env`):

```bash
# Create env vars for the "preview" environment (used for ad-hoc/internal builds)
eas env:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value "YOUR_ACTUAL_API_KEY" --environment preview --visibility plainText
eas env:create --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "YOUR_PROJECT_ID.firebaseapp.com" --environment preview --visibility plainText
eas env:create --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "YOUR_PROJECT_ID" --environment preview --visibility plainText
eas env:create --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "YOUR_PROJECT_ID.appspot.com" --environment preview --visibility plainText
eas env:create --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "YOUR_SENDER_ID" --environment preview --visibility plainText
eas env:create --name EXPO_PUBLIC_FIREBASE_APP_ID --value "YOUR_APP_ID" --environment preview --visibility plainText
```

If you also use a **production** profile for App Store builds, repeat with `--environment production`.

You can copy the values from your local `.env` (do not commit `.env` or paste secrets into docs).

### Option B: Using Expo dashboard

1. Go to [expo.dev](https://expo.dev) → your account → your project (**mentormatch**).
2. Open **Environment variables** (or **Secrets**).
3. Add each variable (e.g. `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, etc.) for the **preview** (and **production** if needed) environment.
4. Use the same values as in your `.env` file.

### After adding variables

1. Trigger a **new** iOS build so the new env is baked in:
   ```bash
   eas build -p ios --profile preview
   ```
2. Install the new build on your iPhone and try logging in again.

Firebase Auth will then be configured in the app and login (email/password or Firebase) should work.

## Optional: Allow the new bundle ID in Firebase (if you changed it)

If you recently changed the app bundle ID to `com.xyz.mentormatch`:

1. In [Firebase Console](https://console.firebase.google.com) → your project → **Project settings** → **General**.
2. Under **Your apps**, add an **iOS app** (if not already) with bundle ID `com.xyz.mentormatch`.
3. Download the new `GoogleService-Info.plist` if you use it; for Expo, the web config in env vars is usually enough for Auth/Firestore.

After that, rebuild with EAS and try logging in again on the iPhone.
