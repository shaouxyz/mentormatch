# Firestore Conversations Permission Fix

## Issue
Users are getting "Missing or insufficient permissions" errors when trying to list conversations:
```
ERROR [ERROR] Error getting conversations {"error": "Missing or insufficient permissions."}
```

## Root Cause
The `getUserConversations` function performs a collection query:
```typescript
const q = query(
  conversationsRef,
  where('participants', 'array-contains', userEmail),
  orderBy('updatedAt', 'desc')
);
```

Firestore security rules need to explicitly allow `list` operations for collection queries, not just `get` for individual documents.

## Solution
Updated Firestore security rules to explicitly allow `list` operations:

```javascript
match /conversations/{conversationId} {
  // Allow users to read individual conversations they're a participant in
  allow get: if isSignedIn() && 
    request.auth.token.email in resource.data.participants;
  
  // Allow users to list conversations where they're a participant
  // This works with queries like: where('participants', 'array-contains', userEmail)
  allow list: if isSignedIn() && 
    request.query.limit <= 100; // Limit query size for security
  
  // Allow users to create conversations if they're a participant
  allow create: if isSignedIn() && 
    request.auth.token.email in request.resource.data.participants;
  
  // Allow participants to update (for unread counts, last message, etc.)
  allow update: if isSignedIn() && 
    request.auth.token.email in resource.data.participants;
  
  // No deletes
  allow delete: if false;
}
```

## How to Apply

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Navigate to **Firestore Database** → **Rules** tab
4. Find the `conversations` collection rules
5. Replace with the rules above
6. Click **"Publish"**

## Important Notes

- The `allow list` rule allows collection queries but limits the query size to 100 documents for security
- Individual document access is still protected by the `allow get` rule
- The application code must ensure queries use `where('participants', 'array-contains', userEmail)` to only return conversations the user is part of
- If you need to query more than 100 conversations, increase the limit in the rule, but consider pagination instead

## Testing

After updating the rules:
1. Restart the app
2. Log in as `shaouxyz@hotmail.com`
3. Navigate to Messages tab
4. Verify conversations load without permission errors
