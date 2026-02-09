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

## Part 3: Apple App Store — iOS release step-by-step

Use this order for a full iOS release from zero to “Submit for Review.”

---

### Step 1: Prerequisites (one-time)

1. **Apple Developer Program**  
   - Enroll at [developer.apple.com](https://developer.apple.com) ($99/year) if you haven’t.

2. **App ID in Apple Developer Portal**  
   - [developer.apple.com/account](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles** → **Identifiers** → **+** → **App IDs** → **App** → Description: e.g. MentorMatch, Bundle ID: **Explicit** → `com.xyz.mentormatch` (must match `app.json` → `ios.bundleIdentifier`). Register.

3. **EAS logged in**  
   - In project folder: `eas whoami`. If not logged in: `eas login`.

4. **Confirm app.json**  
   - `ios.bundleIdentifier`: `com.xyz.mentormatch`  
   - `ios.appleTeamId`: `VGVDQ76R5T`  
   - `version`: e.g. `1.0.0` (this is the user-facing version).

---

### Step 2: Bump version (for a new release)

In **`app.json`**:

- Set **`version`** to the release you’re shipping, e.g. `"1.0.0"` or `"1.0.1"`.
- Save the file.

---

### Step 3: Build the iOS app for App Store

In the project root:

```bash
eas build --platform ios --profile production
```

- When asked for credentials, choose **remote** and let EAS manage certificates.
- Wait for the build to finish on [expo.dev](https://expo.dev) → your project → **Builds**.
- Note the build ID or keep the tab open; you’ll use this build for submit.

---

### Step 4: App Store Connect — create app (first time only)

1. Go to [App Store Connect](https://appstoreconnect.apple.com).
2. **My Apps** → **+** → **New App**.
3. Fill in:
   - **Platform**: iOS  
   - **Name**: MentorMatch  
   - **Primary Language**: e.g. English (U.S.)  
   - **Bundle ID**: choose **com.xyz.mentormatch** (must match `app.json`).  
   - **SKU**: e.g. `mentormatch-ios` (internal, can be anything).  
   - **User Access**: Full Access (or as needed).
4. Create.

---

### Step 5: App Store Connect — app information & pricing

In your app → **App Information**:

- **Privacy Policy URL**: required. You must use a **public URL** that opens in a browser. See **Privacy Policy URL** below for options.
- **Category**: e.g. Education or Social Networking.
- **Subcategory** (optional).

In **Pricing and Availability**:

- Set **Free** or a price tier.

---

### Step 6: Upload the build (EAS Submit)

After the production iOS build has **finished**:

```bash
eas submit --platform ios --profile production --latest
```

- EAS will use the **latest** production iOS build.
- When prompted: sign in with **Apple ID** and use an **app-specific password** if required (generate at [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → App-Specific Passwords).
- Choose the **App Store Connect app** (e.g. MentorMatch) and, if asked, the **Apple ID / team**.
- Submit. The build will appear in App Store Connect under **TestFlight** and will be available to attach to a version.

---

### Step 7: Create a version and attach the build

1. In App Store Connect → your app → **App Store** tab.
2. Under **iOS App**, click **+ Version** or the version number (e.g. **1.0.0**).
3. **Build**: click **+** and select the build you just submitted (from EAS). If it’s not listed, wait a few minutes and refresh.
4. **What’s New in This Version**: add release notes (e.g. “Initial release” or bullet list of changes).
5. Save.

---

### Step 8: App Store listing (screenshots & metadata)

- **Screenshots**: at least one per required device (e.g. 6.7" iPhone, 6.5", 5.5"). Capture from Simulator or a real device.
- **Description**: app description (what the app does).
- **Keywords**: comma-separated (no spaces after commas); used for search.
- **Support URL**: required (e.g. your support page or contact).
- **Marketing URL** (optional).

---

### Step 9: App Privacy & Age Rating

1. **App Privacy** (required):  
   - **App Privacy** in the left sidebar → **Get Started** → answer the data collection questionnaire (what data you collect and how it’s used). Save and publish.

2. **Age Rating**:  
   - In the version page, open **Age Rating** → answer the questionnaire. Save.

---

### Step 10: Submit for Review

1. In the version page, complete any remaining required fields (all should show a green check or “Complete”).
2. **Review notes** (optional): e.g. test account (email/password) if the app has login.
3. Click **Add for Review** (if not already added), then **Submit to App Review**.
4. Confirm. Status will change to **Waiting for Review**; review usually takes **24–48 hours**.

---

### Step 11: After approval

- Apple will notify you; status becomes **Ready for Sale**.
- The app will go live on the App Store according to your **Pricing and Availability** and release setting (manual or automatic).

---

## Part 3 (reference): Apple App Store details

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

## Privacy Policy URL (App Store & Play Store)

Apple and Google require a **public URL** to your privacy policy (a page that opens in a browser).

### Option 1: You already have a website
- Put your privacy policy on your site (e.g. `https://yoursite.com/privacy`) and use that URL in App Store Connect and Play Console.

### Option 2: Use the HTML file in this repo
- The project includes **`docs/privacy-policy.html`** (a single-page privacy policy). Host it somewhere public and use that URL.

**Ways to get a URL for `privacy-policy.html`:**
- **GitHub Pages**: Create a repo (e.g. `mentormatch-legal`), add `privacy-policy.html` as `index.html` in the root or in a `privacy` folder, enable GitHub Pages in repo Settings → Pages. URL will be like `https://yourusername.github.io/mentormatch-legal/` or `.../mentormatch-legal/privacy/`.
- **Netlify / Vercel**: Drag-and-drop the `docs` folder or connect the repo; use the generated URL (e.g. `https://your-site.netlify.app/privacy-policy.html`).
- **Google Sites / Notion**: Create a page, paste the content (or link to the file), publish, and use the page URL.
- **Your own domain**: Upload `privacy-policy.html` to your web host and use e.g. `https://yourdomain.com/privacy`.

### What to enter in App Store Connect
1. In your app → **App Information** (or the version page).
2. Find **Privacy Policy URL**.
3. Enter the **full URL** (e.g. `https://yourusername.github.io/mentormatch-legal/` or your custom URL). It must start with `https://` and open in a browser.
4. Save.

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
