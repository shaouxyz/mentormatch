# firestore.rules – diff from previous version

**Compared:** `cd203b4` → `HEAD` (commit `fc44804` – Meetings, Messages & Requests)

**Scope:** Only the **meetings** rules changed. No other parts of `firestore.rules` were modified in this range.

---

## Summary of changes

| Location | Change |
|----------|--------|
| Meetings comment | Added note about `organizerEmailLower` / `participantEmailLower` for case-insensitive match. |
| `allow read` | Added checks for `organizerEmailLower` and `participantEmailLower` (with `resource.data.get(..., '')`). |
| `allow update` | Same two `*Lower` checks added. |
| `allow delete` | Condition expanded to allow when `organizerEmail` **or** `organizerEmailLower` matches. |

---

## Full diff (git format)

```
diff --git a/firestore.rules b/firestore.rules
index 50d1fe5..7348bac 100644
--- a/firestore.rules
+++ b/firestore.rules
@@ -48,11 +48,13 @@ service cloud.firestore {
       allow update, delete: if false;
     }
     
-    // Meetings collection
+    // Meetings collection (organizerEmailLower/participantEmailLower allow case-insensitive match)
     match /meetings/{meetingId} {
       allow read: if isSignedIn() && 
         (resource.data.organizerEmail == request.auth.token.email || 
-         resource.data.participantEmail == request.auth.token.email);
+         resource.data.participantEmail == request.auth.token.email ||
+         resource.data.get('organizerEmailLower', '') == request.auth.token.email ||
+         resource.data.get('participantEmailLower', '') == request.auth.token.email);
       allow create: if isSignedIn() && 
         request.resource.data.organizerEmail == request.auth.token.email &&
         request.resource.data.participantEmail is string &&
@@ -60,9 +62,12 @@ service cloud.firestore {
         request.resource.data.date is string;
       allow update: if isSignedIn() && 
         (resource.data.organizerEmail == request.auth.token.email || 
-         resource.data.participantEmail == request.auth.token.email);
+         resource.data.participantEmail == request.auth.token.email ||
+         resource.data.get('organizerEmailLower', '') == request.auth.token.email ||
+         resource.data.get('participantEmailLower', '') == request.auth.token.email);
       allow delete: if isSignedIn() && 
-        resource.data.organizerEmail == request.auth.token.email;
+        (resource.data.organizerEmail == request.auth.token.email ||
+         resource.data.get('organizerEmailLower', '') == request.auth.token.email);
     }
     
     // Conversations collection
```

---

*To regenerate: `git diff cd203b4..HEAD -- firestore.rules`*
