# Debugging login on the installed app (e.g. iPhone from EAS build)

When you install the app via EAS (QR code or direct install), you can't see Metro/console logs. Use these ways to see why login fails.

## 1. In-app debug block (login screen)

After the last commit, the **login screen** shows a gray **Debug** section at the bottom:

- **Firebase: yes / no**  
  - **no** → This build was not built with Firebase env vars. Login only uses local storage; your cloud account (e.g. shaouxyz@hotmail.com) won't work until you rebuild with [EAS env vars](https://docs.expo.dev/build-reference/variables/) set for the build profile (e.g. preview).
- **Last error code** and **Last error msg**  
  Shown after the first failed login attempt. Common values:
  - `auth/invalid-credential` → Wrong password or email (try **Forgot password?**).
  - `auth/network-request-failed` → Device has no internet or can't reach Firebase.
  - `auth/too-many-requests` → Rate limited; wait or use Forgot password.
  - `none` / message like "User with this email already exists" → Logic path (local vs Firebase); the message tells you what failed.

**What to do:** Try to log in once. Then read the Debug section (or take a screenshot) and fix accordingly:
- Firebase: no → Set Firebase env in EAS and create a new build.
- Code: auth/invalid-credential → Use Forgot password? or check email/password.
- Code: auth/network-request-failed → Check Wi‑Fi/cellular and try again.

## 2. EAS Build logs (optional)

When you run `eas build`, the build logs are on expo.dev. They don’t show runtime login errors, but they confirm the build used the right env (e.g. that Firebase vars were present at build time).

## 3. Development build + Metro (full logs)

To see full JS logs while using a build similar to the one from the QR code:

1. Create a **development** build and install it on the device:
   ```bash
   eas build --profile development --platform ios
   ```
2. Run Metro and connect the device (same Wi‑Fi or tunnel):
   ```bash
   npm run start
   # or: npx expo start
   ```
3. Open the app on the device; login attempts will log to the Metro terminal (and you’ll see Firebase/config logs if you add them).

## 4. Remove the debug block later

The Debug block is for troubleshooting. When login works for you, you can remove or hide it (e.g. behind a “Show debug” tap or only when `__DEV__` or an env flag is set).
