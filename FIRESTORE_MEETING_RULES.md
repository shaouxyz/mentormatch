# Firestore Security Rules for Meetings

This document provides the security rules for the `meetings` and `conversations` collections in Firestore.

## Meetings Collection Rules

```javascript
match /meetings/{meetingId} {
  // Allow users to read meetings they're involved in (as organizer or participant)
  allow read: if isSignedIn() && 
    (resource.data.organizerEmail == request.auth.token.email || 
     resource.data.participantEmail == request.auth.token.email);
  
  // Allow users to create meetings as the organizer
  allow create: if isSignedIn() && 
    request.resource.data.organizerEmail == request.auth.token.email &&
    request.resource.data.participantEmail is string &&
    request.resource.data.title is string &&
    request.resource.data.date is string;
  
  // Allow organizer or participant to update (for accepting/declining)
  allow update: if isSignedIn() && 
    (resource.data.organizerEmail == request.auth.token.email || 
     resource.data.participantEmail == request.auth.token.email);
  
  // Allow only the organizer to delete
  allow delete: if isSignedIn() && 
    resource.data.organizerEmail == request.auth.token.email;
}
```

## Conversations Collection Rules

```javascript
match /conversations/{conversationId} {
  // Allow users to read conversations they're a participant in
  allow read: if isSignedIn() && 
    request.auth.token.email in resource.data.participants;
  
  // Allow users to create conversations if they're a participant
  allow create: if isSignedIn() && 
    request.auth.token.email in request.resource.data.participants &&
    request.resource.data.participants is list;
  
  // Allow participants to update (for unread counts, last message)
  allow update: if isSignedIn() && 
    request.auth.token.email in resource.data.participants;
  
  // Don't allow deletes (preserve conversation history)
  allow delete: if false;
}
```

## Complete Firestore Security Rules

**IMPORTANT**: Copy this entire rules file to your Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click "Firestore Database" in the left menu
4. Click "Rules" tab
5. Replace ALL content with the rules below
6. Click "Publish"

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Profiles collection
    match /profiles/{profileId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && 
        request.resource.data.email == request.auth.token.email;
      allow update: if isSignedIn() && 
        resource.data.email == request.auth.token.email;
      allow delete: if false;
    }
    
    // Mentorship requests collection
    match /mentorshipRequests/{requestId} {
      allow read: if isSignedIn() && 
        (resource.data.requesterEmail == request.auth.token.email || 
         resource.data.mentorEmail == request.auth.token.email);
      allow create: if isSignedIn() && 
        request.resource.data.requesterEmail == request.auth.token.email;
      allow update: if isSignedIn() && 
        (resource.data.requesterEmail == request.auth.token.email || 
         resource.data.mentorEmail == request.auth.token.email);
      allow delete: if isSignedIn() && 
        resource.data.requesterEmail == request.auth.token.email;
    }
    
    // Messages collection
    match /messages/{messageId} {
      allow read: if isSignedIn() && 
        (resource.data.senderEmail == request.auth.token.email || 
         resource.data.receiverEmail == request.auth.token.email);
      allow create: if isSignedIn() && 
        request.resource.data.senderEmail == request.auth.token.email &&
        request.resource.data.chatId is string &&
        request.resource.data.text is string;
      allow update, delete: if false;
    }
    
    // Meetings collection
    match /meetings/{meetingId} {
      allow read: if isSignedIn() && 
        (resource.data.organizerEmail == request.auth.token.email || 
         resource.data.participantEmail == request.auth.token.email);
      allow create: if isSignedIn() && 
        request.resource.data.organizerEmail == request.auth.token.email &&
        request.resource.data.participantEmail is string &&
        request.resource.data.title is string &&
        request.resource.data.date is string;
      allow update: if isSignedIn() && 
        (resource.data.organizerEmail == request.auth.token.email || 
         resource.data.participantEmail == request.auth.token.email);
      allow delete: if isSignedIn() && 
        resource.data.organizerEmail == request.auth.token.email;
    }
    
    // Conversations collection
    match /conversations/{conversationId} {
      allow read: if isSignedIn() && 
        request.auth.token.email in resource.data.participants;
      allow create: if isSignedIn() && 
        request.auth.token.email in request.resource.data.participants &&
        request.resource.data.participants is list;
      allow update: if isSignedIn() && 
        request.auth.token.email in resource.data.participants;
      allow delete: if false;
    }
    
    // Invitation codes collection
    match /invitationCodes/{codeId} {
      // Users can read codes they created
      allow read: if isSignedIn() && 
        resource.data.createdBy == request.auth.token.email;
      // Users can create codes for themselves
      allow create: if isSignedIn() && 
        request.resource.data.createdBy == request.auth.token.email &&
        request.resource.data.code is string &&
        request.resource.data.isUsed == false;
      // Users can update codes they created (to mark as used)
      allow update: if isSignedIn() && 
        resource.data.createdBy == request.auth.token.email;
      // Don't allow deletes
      allow delete: if false;
    }
    
    // Inbox collection
    match /inbox/{itemId} {
      // Users can only read their own inbox items
      allow read: if isSignedIn() && 
        resource.data.recipientEmail == request.auth.token.email;
      // Users can create inbox items for themselves (or system can create for them)
      allow create: if isSignedIn() && 
        request.resource.data.recipientEmail == request.auth.token.email;
      // Users can update their own inbox items (e.g., mark as read)
      allow update: if isSignedIn() && 
        resource.data.recipientEmail == request.auth.token.email;
      // Don't allow deletes
      allow delete: if false;
    }
  }
}
```

## Testing the Rules

After publishing the rules, test them in the Firebase Console:

### Test 1: Create Meeting
```javascript
// Request auth context
{
  "email": "user1@example.com"
}

// Document path
/meetings/test123

// Document data
{
  "organizerEmail": "user1@example.com",
  "participantEmail": "user2@example.com",
  "title": "Test Meeting",
  "date": "2026-02-01T10:00:00Z"
}

// Expected: ✅ Allow
```

### Test 2: Read Meeting (Participant)
```javascript
// Request auth context
{
  "email": "user2@example.com"
}

// Document path
/meetings/test123

// Expected: ✅ Allow (user2 is the participant)
```

### Test 3: Read Meeting (Unauthorized)
```javascript
// Request auth context
{
  "email": "user3@example.com"
}

// Document path
/meetings/test123

// Expected: ❌ Deny (user3 is not involved in this meeting)
```

## Next Steps

1. ✅ Copy the complete rules to Firebase Console
2. ✅ Publish the rules
3. ✅ Test meeting creation in the app
4. ✅ Test meeting response (accept/decline)
5. ✅ Verify security by trying to access other users' meetings
