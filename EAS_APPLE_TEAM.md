# EAS Build: "No team associated with your Apple account"

If you see:
```text
Authentication with Apple Developer Portal failed!
You have no team associated with your Apple account, cannot proceed.
(Do you have a paid Apple Developer account?)
```

and you **do** have a paid Apple Developer account (individual), try these in order.

## 1. Accept agreements in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com) and sign in with the **same Apple ID** you use for EAS.
2. Open **Agreements, Tax, and Banking** (under your name / account).
3. Accept any **pending** agreements (e.g. Paid Applications, updated terms).
4. Wait a few minutes, then run the iOS build again:  
   `eas build -p ios --profile preview` (or your profile).

## 2. Set your Apple Team ID in the project

If EAS still can’t see a team, tell it which team to use.

1. **Get your Team ID**
   - Go to [Apple Developer → Membership](https://developer.apple.com/account#MembershipDetailsCard).
   - Sign in with the same Apple ID.
   - Find **Team ID** (e.g. `ABCD1234`).

2. **Add it to `app.json`**
   - Under `expo.ios`, add (or update) `appleTeamId` with that ID:
   ```json
   "ios": {
     "appleTeamId": "YOUR_TEAM_ID_HERE",
     "supportsTablet": true,
     "bundleIdentifier": "com.mentormatch.app",
     ...
   }
   ```
   - Replace `YOUR_TEAM_ID_HERE` with your actual Team ID.

3. **Run the build again**
   - `eas build -p ios --profile preview` (or your profile).

## 3. Clear stored Apple credentials and re-login

Sometimes EAS uses old credentials that don’t have team access.

1. Clear credentials for this project:
   ```bash
   eas credentials -p ios
   ```
   Then remove or reconfigure the Apple (Distribution) credentials for the profile you use.

2. Run the build again. When prompted, sign in with your **Apple ID that has the paid Developer Program** and use the same account that shows the team in developer.apple.com.

## 4. Confirm the right Apple ID and team

- The Apple ID you enter in EAS must be the **Account Holder** (or have a role that can sign agreements) for the Developer Program.
- In [App Store Connect → Users and Access](https://appstoreconnect.apple.com/access/users), your user should see a **Team** (for an individual account it’s usually your name as the team).
- If you use multiple Apple IDs, make sure the one with the **paid enrollment and team** is the one you use with EAS.

## 5. If it still fails: contact Apple

Some people have fixed this only after Apple fixed something on their side (e.g. account not fully activated, name/account mismatch).

- **Apple Developer Support**: [developer.apple.com/contact](https://developer.apple.com/contact/)
- Say you have a paid Apple Developer Program membership but EAS Build reports “You have no team associated with your Apple account” and ask them to confirm your account and team are active and visible for API/portal access.

After any change (agreements, Team ID in `app.json`, or new credentials), run the build again:

```bash
eas build -p ios --profile preview
```

(or use `production` / `development` if that’s what you use.)
