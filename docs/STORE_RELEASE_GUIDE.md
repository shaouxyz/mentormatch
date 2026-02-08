# Releasing MentorMatch to Google Play and App Store

This guide walks you through submitting the app to **Google Play** and **Apple App Store** using EAS Build and EAS Submit.

---

## Prerequisites

### Both stores
- [ ] App is working and tested (preview builds).
- [ ] **EAS CLI** logged in: `eas whoami` (log in with `eas login` if needed).
- [ ] **Production builds** use the right config (see below).

### Google Play
- [ ] **Google Play Developer account** ($25 one-time): [play.google.com/console](https://play.google.com/console).
- [ ] **Android App Bundle (AAB)** for production (already set in `eas.json` for production).

### Apple App Store
- [ ] **Apple Developer Program** ($99/year): [developer.apple.com](https://developer.apple.com).
- [ ] **App ID** in Apple Developer Portal matching `app.json` → `ios.bundleIdentifier`: `com.xyz.mentormatch`.
- [ ] **Team ID** in `app.json` (you have `VGVDQ76R5T`).

---

## Part 1: Build production artifacts

### 1.1 Bump version (if this is a new release)

In `app.json`:
- **version**: user-visible, e.g. `"1.0.0"` → `"1.0.1"`.
- **ios**: no extra field needed; EAS uses `version`.
- **android**: bump **versionCode** (integer) for each Play Store upload, e.g. `"versionCode": 2`.

### 1.2 Build for Android (AAB for Play Store)

```bash
eas build --platform android --profile production
```

- When prompted for credentials, use **remote** and let EAS manage the keystore (answer **Y** to generate/use existing).
- Wait for the build; then in [expo.dev](https://expo.dev) → your project → **Builds**, download the **.aab** or note the build URL.

### 1.3 Build for iOS (for App Store)

```bash
eas build --platform ios --profile production
```

- First time: EAS may ask for Apple credentials (Apple ID, app-specific password, or distribution certificate). Follow the prompts.
- Ensure the **bundle identifier** in the build matches App Store Connect: `com.xyz.mentormatch`.
- When the build finishes, you can submit it with EAS Submit (see below) or from App Store Connect.

---

## Part 2: Google Play Store

### 2.1 Create the app in Play Console (first time only)

1. Go to [Google Play Console](https://play.google.com/console).
2. **Create app** → enter app name (e.g. MentorMatch), default language, and declare if it’s free/paid.
3. Complete **App content** requirements (e.g. privacy policy, ads declaration if you use ads, etc.).

### 2.2 Store listing

- **Short description** (max 80 chars) and **Full description** (max 4000 chars).
- **Graphics**: app icon 512×512, feature graphic 1024×500, and at least 2 **phone screenshots** (min 320px short side).
- **Categorization**: category (e.g. Education or Social), contact email.

### 2.3 Content rating

- Use the in-console **Questionnaire** to get a rating (e.g. Everyone, Teen).
- Submit and wait for the rating to be set.

### 2.4 Upload the AAB

1. In Play Console: **Release** → **Production** (or **Testing** first) → **Create new release**.
2. **Upload** the `.aab` from EAS (download from Expo dashboard or use the build URL).
3. Add **Release name** (e.g. “1.0.0 (1)”) and **Release notes**.
4. Save and **Review release** → **Start rollout to Production** (or to a testing track).

### 2.5 Submit for review

- Complete any remaining **App content** items (e.g. target audience, news app declaration if needed).
- **Send for review**. First review can take from a few hours to a few days.

---

## Part 3: Apple App Store

### 3.1 App Store Connect (first time only)

1. Go to [App Store Connect](https://appstoreconnect.apple.com).
2. **My Apps** → **+** → **New App**.
   - **Platform**: iOS.
   - **Name**: MentorMatch.
   - **Primary language**, **Bundle ID**: select or create `com.xyz.mentormatch` (must match `app.json`).
   - **SKU**: e.g. `mentormatch-ios`.

### 3.2 App information and pricing

- **Privacy Policy URL** (required).
- **Category** (e.g. Education or Social Networking).
- **Pricing**: Free or set a price.

### 3.3 Prepare the build (upload)

**Option A – EAS Submit (recommended)**

After your iOS production build has finished:

```bash
eas submit --platform ios --profile production --latest
```

- EAS will use the **latest** production iOS build. Follow prompts (Apple ID, app-specific password, or select build by ID).
- The build will appear in App Store Connect under **TestFlight** first, then you can promote it to the app’s version.

**Option B – Manual**

1. Download the `.ipa` from the EAS build page (or use the build artifact).
2. Upload with **Transporter** (Mac App Store) or **Xcode** → Window → Organizer → Distribute App.

### 3.4 Version and build in App Store Connect

1. In App Store Connect → your app → **+ Version** (e.g. 1.0.0).
2. **Build**: select the build you uploaded (from EAS Submit or Transporter).
3. **What’s New**: release notes for this version.

### 3.5 App Store listing

- **Screenshots**: at least one per required device size (e.g. 6.7", 6.5", 5.5" for iPhones). Use Simulator or device.
- **Description**, **Keywords**, **Support URL**, **Marketing URL** (optional).

### 3.6 Submit for review

- Complete **App Privacy** (data collection declaration).
- **Age Rating** questionnaire.
- **Review notes** if needed (e.g. test account for login).
- Click **Submit for Review**. Review usually takes 24–48 hours.

---

## Part 4: EAS Submit (quick reference)

After builds are ready:

```bash
# Submit latest Android production build to Play Store (track configured in submit profile)
eas submit --platform android --profile production --latest

# Submit latest iOS production build to App Store
eas submit --platform ios --profile production --latest
```

For **first-time submit** you may need to:
- **Android**: In Play Console, create the app and at least one internal or production release so the app exists; then upload the AAB (EAS Submit can upload to an existing app if configured).
- **iOS**: Ensure the app and version exist in App Store Connect and the build is uploaded (via EAS Submit or Transporter).

---

## Checklist summary

| Step | Android | iOS |
|------|---------|-----|
| Developer account | Play Console $25 | Apple Developer $99/yr |
| Build | `eas build --platform android --profile production` (AAB) | `eas build --platform ios --profile production` |
| Upload | Play Console → Release → Upload AAB, or `eas submit` | App Store Connect (via EAS Submit or Transporter) |
| Listing | Store listing, screenshots, feature graphic | Screenshots, description, metadata |
| Content / Legal | Content rating, privacy policy | Privacy policy, age rating, App Privacy |
| Submit | Start rollout / Send for review | Submit for Review |

---

## Troubleshooting

- **Android “You need to use a different version code”**: Bump `versionCode` in `app.json` → `android.versionCode`.
- **iOS “No valid signing identity”**: In EAS, use **remote** credentials and let EAS manage the distribution certificate and provisioning profile; or run `eas credentials --platform ios` to fix.
- **iOS “Bundle ID doesn’t match”**: Ensure `app.json` → `ios.bundleIdentifier` matches the App ID in App Store Connect and Developer Portal.

For more detail:
- [EAS Submit – Expo](https://docs.expo.dev/submit/introduction/)
- [Google Play – Publish](https://support.google.com/googleplay/android-developer/answer/9859152)
- [App Store Connect – Submit](https://developer.apple.com/help/app-store-connect/submit-your-app/submit-your-app-for-review)
