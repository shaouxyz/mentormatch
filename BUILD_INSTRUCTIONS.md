# Building APK for MentorMatch

This guide will help you build an APK file that can be installed on Android devices.

## Prerequisites

1. **Expo Account**: You need a free Expo account
   - Sign up at https://expo.dev/signup
   - Or use: `eas login` (if you already have an account)

2. **EAS CLI**: Already installed ✅

## Step-by-Step Build Process

### 1. Login to Expo

```bash
eas login
```

Enter your Expo email/username and password when prompted.

### 2. Configure Build (Already Done ✅)

The `eas.json` file has been created with the correct configuration for building APK files.

### 3. Build the APK

Choose one of these options:

#### Option A: Build Preview APK (Recommended for testing)
```bash
eas build --platform android --profile preview
```

#### Option B: Build Production APK
```bash
eas build --platform android --profile production
```

### 4. Download the APK

After the build completes (usually 10-20 minutes):

1. You'll get a link in the terminal
2. Or visit https://expo.dev/accounts/[your-username]/projects/mentormatch/builds
3. Download the APK file
4. Share it with users or upload to Google Play Store

### 5. Install on Android Device

Users can install the APK by:
1. Downloading the APK file to their Android device
2. Enabling "Install from Unknown Sources" in Settings
3. Opening the APK file and tapping "Install"

## Build Profiles Explained

- **preview**: Builds an APK for testing (faster, no app signing)
- **production**: Builds a signed APK ready for distribution

## Alternative: Local Build (Advanced)

If you want to build locally without EAS:

```bash
npx expo prebuild
cd android
./gradlew assembleRelease
```

The APK will be in `android/app/build/outputs/apk/release/`

## Troubleshooting

- **Build fails**: Check the build logs at expo.dev
- **APK too large**: Consider enabling ProGuard in `app.json`
- **Signing issues**: EAS handles signing automatically

## Next Steps

After building:
1. Test the APK on a real device
2. Consider uploading to Google Play Store
3. Set up app signing for production releases
