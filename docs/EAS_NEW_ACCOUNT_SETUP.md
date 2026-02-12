# Set up EAS Build and Secrets with a New Expo Account

Use this when you've created a **new Expo account** (e.g. after using all free builds on the old one) and need to link your MentorMatch project to the new account and add Firebase secrets.

---

## Step 1: Switch to the new Expo account

In your project folder:

```bash
eas logout
eas login
```

Sign in with your **new** Expo account (email/password or SSO).

---

## Step 2: Unlink the project from the old account

The project is currently linked to an EAS project (old account) via `app.json`. You need to unlink so EAS can create/link a **new** project under your new account.

1. Open **`app.json`** in the repo.
2. Remove the **`extra.eas.projectId`** and **`updates`** block so the project is no longer tied to the old project:
   - Delete the line `"projectId":"a027433a-a98a-499c-8e19-e4581565b366"` (and the surrounding `"eas": { }` if that’s all that’s in `extra.eas`).
   - Delete the whole `"updates": { "enabled": true, "url": "https://u.expo.dev/..." }` block (or set `"enabled": false` and remove `url`).
3. Keep **`extra.router`** and any other `extra` fields you use. If `extra` becomes empty except for `router`, you can leave `"extra": { "router": {} }`.
4. Save `app.json`.

Example: if `app.json` has:

```json
"updates": { "enabled": true, "url": "https://u.expo.dev/a027433a-a98a-499c-8e19-e4581565b366" },
"extra": { "router": {}, "eas": { "projectId": "a027433a-a98a-499c-8e19-e4581565b366" }
```

remove the `updates` block and the `"eas": { "projectId": "..." }` part so you have:

```json
"extra": { "router": {} }
```

---

## Step 3: Link to a new EAS project (new account)

In the project folder:

```bash
eas init
```

- When asked to **create a new project** or **link to an existing project**, choose **Create a new project**.
- When asked for the project name, use e.g. **MentorMatch** (or the same slug as before).
- EAS will create the project under your **new** account and update **`app.json`** with the new **`projectId`** and **`updates.url`**. Do not edit these manually unless you know what you’re doing.

Confirm that **`app.json`** now has a new **`extra.eas.projectId`** and (if you use OTA updates) **`updates.url`** pointing to the new project.

---

## Step 4: Add EAS Secrets (Firebase and any others)

Your app needs the Firebase env vars in EAS so production/preview builds can log in. Add them as **Secrets** for this project.

### Option A: Expo dashboard (recommended)

1. Go to **[expo.dev](https://expo.dev)** and sign in with your **new** account.
2. Open the **MentorMatch** project (the one you just created/linked).
3. Go to **Project settings** (or the project menu) → **Secrets**.
4. Add each secret **by name and value**. Names must match exactly:

| Name | Value (from your `.env`) |
|------|---------------------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | (paste from .env) |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | (paste from .env) |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | (paste from .env) |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | (paste from .env) |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | (paste from .env) |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | (paste from .env) |

Use the **exact** values from your local **`.env`** (do not commit `.env` or paste it here; only the values in the dashboard).

### Option B: EAS CLI

From the project folder (with the new account logged in):

```bash
eas secret:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value "YOUR_VALUE" --type string
eas secret:create --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "YOUR_VALUE" --type string
eas secret:create --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "YOUR_VALUE" --type string
eas secret:create --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "YOUR_VALUE" --type string
eas secret:create --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "YOUR_VALUE" --type string
eas secret:create --name EXPO_PUBLIC_FIREBASE_APP_ID --value "YOUR_VALUE" --type string
```

Replace `YOUR_VALUE` with each value from your `.env`. Use quotes so special characters don’t break the shell.

To list secrets (to double-check):

```bash
eas secret:list
```

---

## Step 5: Run a build

Use the **new** account’s build quota:

```bash
eas build --platform android --profile production
```

or

```bash
eas build --platform ios --profile production
```

When the build runs, EAS will use the **new** project and the **secrets** you added, so Firebase (and login) will work in the built app.

---

## Summary checklist

- [ ] `eas logout` then `eas login` (new account).
- [ ] In `app.json`, remove old `extra.eas.projectId` and `updates` (or set updates disabled).
- [ ] Run `eas init` and create a **new** EAS project (so `app.json` gets the new projectId).
- [ ] Add the 6 Firebase secrets in [expo.dev](https://expo.dev) → project → Secrets (or via `eas secret:create`).
- [ ] Run `eas build --platform android --profile production` (or ios) to confirm builds use the new account and secrets.

After this, all new EAS builds will use your new account and the Firebase config from EAS Secrets, so production and preview builds can log in.
