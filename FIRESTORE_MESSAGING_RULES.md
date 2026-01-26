# Firestore Security Rules for Messaging

## Rules to Add

Add these rules to your existing Firestore security rules in Firebase Console:

```javascript
// Messages collection
match /messages/{messageId} {
  // Users can read messages in conversations they're part of
  allow read: if isSignedIn() && (
    resource.data.senderEmail == request.auth.token.email ||
    resource.data.receiverEmail == request.auth.token.email
  );
  
  // Users can send messages (create)
  allow create: if isSignedIn() && 
    request.resource.data.senderEmail == request.auth.token.email;
  
  // No updates or deletes for now (messages are immutable)
  allow update, delete: if false;
}

// Conversations collection
match /conversations/{conversationId} {
  // Users can read conversations they're part of
  allow read: if isSignedIn() && 
    request.auth.token.email in resource.data.participants;
  
  // Users can create conversations if they're one of the participants
  allow create: if isSignedIn() && 
    request.auth.token.email in request.resource.data.participants;
  
  // Users can update conversations they're part of (for unread counts, last message, etc.)
  allow update: if isSignedIn() && 
    request.auth.token.email in resource.data.participants;
  
  // No deletes
  allow delete: if false;
}
```

## Complete Rules (Updated)

Here's the complete security rules including profiles, requests, messages, and conversations:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userEmail) {
      return request.auth.token.email == userEmail;
    }
    
    // Profiles collection
    match /profiles/{email} {
      // Anyone can read all profiles (for discovery feature)
      allow read: if true;
      
      // Only authenticated users can create their own profile
      allow create: if isSignedIn() && isOwner(email);
      
      // Only profile owner can update or delete their profile
      allow update, delete: if isSignedIn() && isOwner(email);
    }
    
    // Mentorship requests collection
    match /mentorshipRequests/{requestId} {
      // Users can read requests where they are either sender or receiver
      allow read: if isSignedIn() && (
        resource.data.requesterEmail == request.auth.token.email ||
        resource.data.mentorEmail == request.auth.token.email
      );
      
      // Authenticated users can create requests (as requester)
      allow create: if isSignedIn() && 
        request.resource.data.requesterEmail == request.auth.token.email;
      
      // Only mentor can update request (to accept/decline)
      allow update: if isSignedIn() && 
        resource.data.mentorEmail == request.auth.token.email;
      
      // Only requester can delete pending requests
      allow delete: if isSignedIn() && 
        resource.data.requesterEmail == request.auth.token.email &&
        resource.data.status == 'pending';
    }
    
    // Messages collection
    match /messages/{messageId} {
      // Users can read messages in conversations they're part of
      allow read: if isSignedIn() && (
        resource.data.senderEmail == request.auth.token.email ||
        resource.data.receiverEmail == request.auth.token.email
      );
      
      // Users can send messages (create)
      allow create: if isSignedIn() && 
        request.resource.data.senderEmail == request.auth.token.email;
      
      // No updates or deletes for now (messages are immutable)
      allow update, delete: if false;
    }
    
    // Conversations collection
    match /conversations/{conversationId} {
      // Users can read individual conversations they're part of
      allow get: if isSignedIn() && 
        request.auth.token.email in resource.data.participants;
      
      // Users can list conversations where they're a participant
      // This works with queries like: where('participants', 'array-contains', userEmail)
      allow list: if isSignedIn() && 
        request.query.limit <= 100; // Limit query size for security
      
      // Users can create conversations if they're one of the participants
      allow create: if isSignedIn() && 
        request.auth.token.email in request.resource.data.participants;
      
      // Users can update conversations they're part of (for unread counts, last message, etc.)
      allow update: if isSignedIn() && 
        request.auth.token.email in resource.data.participants;
      
      // No deletes
      allow delete: if false;
    }
  }
}
```

## How to Update

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Navigate to **Firestore Database** → **Rules** tab
4. Replace the existing rules with the complete rules above
5. Click **"Publish"**

## Test the Rules

After publishing, try:
1. ✅ Send a message to a connection
2. ✅ View messages in a conversation
3. ✅ See conversations list

All should work without permission errors!
