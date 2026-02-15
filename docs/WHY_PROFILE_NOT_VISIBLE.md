# Why averylu@gmail.com's profile isn't visible to shaouxyz@hotmail.com

**Users:** averylu@gmail.com (UID `SonoEIpVlZhUhpCAFYGIMNr5uf62`, signed up Feb 15, 2026) and shaouxyz@hotmail.com (viewing on Android).

---

## How the app shows profiles

1. **Discover (home)** loads all profiles from Firestore via `getAllFirebaseProfiles()` (no `where`, uses `orderBy('createdAt', 'desc')`), then:
   - Excludes the current user (shaouxyz)
   - Excludes emails in `DISCOVER_HIDDEN_EMAILS` (only `shaouxyz+test@hotmail.com` — not averylu)
   - Slices to the first **100** profiles (`maxProfilesToLoad`) for performance
2. **Profile view** shows a user when you tap from the list or open by email; it uses `hybridGetProfile(email)` (Firestore doc `profiles/<email>`).

So if averylu doesn’t appear in Discover, shaouxyz never gets a way to open their profile.

---

## Most likely cause: No Firestore profile document for averylu

Profiles in Firestore are stored at **`profiles/<email>`** (e.g. `profiles/averylu@gmail.com`). The app **only creates** that document when:

- User logs in, and
- `hybridGetProfile(user.email)` returns **null** (no profile in Firestore), and
- There is a **local profile** in AsyncStorage (`profile` key) with the same email.

So if averylu:

- Signed up but **never completed the profile form** (name, expertise, etc.), or
- Completed the profile on a device/session that didn’t persist (e.g. cleared data, new install), or
- Never triggered the “sync local profile to Firestore” path on login,

then **no document** `profiles/averylu@gmail.com` exists. The Auth user exists; the Firestore profile does not, so they never show up in the list.

---

## Other possible causes

1. **Document exists but has no `createdAt`**  
   `getAllFirebaseProfiles()` uses `orderBy('createdAt', 'desc')`. In Firestore, documents **without** the `orderBy` field are **excluded** from the query. So if averylu’s doc was created manually or by another path and doesn’t have `createdAt`, it won’t be returned in the list.

2. **List capped at 100**  
   Discover only shows the first 100 profiles (by `createdAt` desc). If there are 100+ profiles and averylu’s is older than the 100 newest, they’d be cut off. For a Feb 15 signup this is less likely unless there are many newer profiles.

---

## What to check in Firebase

1. **Firestore**  
   - Open **Firestore Database** → **profiles** collection.  
   - Look for a document whose ID is **`averylu@gmail.com`** (or the exact email used at signup).  
   - If it’s missing → profile was never created (see “Fix” below).  
   - If it exists → open it and check:  
     - Is there a **`createdAt`** field (timestamp or string)? If not, add one so the profile is included in the “all profiles” query.

2. **Auth**  
   - You already confirmed averylu@gmail.com exists in Authentication (UID `SonoEIpVlZhUhpCAFYGIMNr5uf62`). No change needed there for visibility.

---

## Fix

**If there is no `profiles/averylu@gmail.com` document:**

- Have **averylu** log in on the app, complete the profile form (name, expertise, interest, etc.), and save. On the next login the app should sync the local profile to Firestore and create `profiles/averylu@gmail.com` with `createdAt`/`updatedAt`.  
- Or create the document manually in Firestore:  
  - Collection: **profiles**  
  - Document ID: **averylu@gmail.com**  
  - Fields: at least `email`, `name`, `expertise`, `interest`, `expertiseYears`, `interestYears`, `phoneNumber`, and **`createdAt`** / **`updatedAt`** (e.g. `2026-02-15T00:00:00.000Z` or current timestamp) so the profile is included in the Discover query.

**If the document exists but has no `createdAt`:**

- Edit the document and add:
  - `createdAt`: timestamp or ISO string (e.g. signup date Feb 15, 2026)
  - `updatedAt`: same or current time  
  Then have shaouxyz pull-to-refresh Discover; averylu’s profile should appear (and be within the first 100 if total profiles ≤ 100).

---

## Summary

| Check | Result |
|-------|--------|
| Firestore doc `profiles/averylu@gmail.com` exists? | Verify in Console. |
| Doc has `createdAt` (and `updatedAt`)? | Required for listing in Discover. |
| averylu completed profile in-app and synced on login? | If not, create doc manually or have them complete profile and re-login. |

After the document exists and has `createdAt`, shaouxyz@hotmail.com should be able to see averylu’s profile in the Android app (Discover list and profile view).
