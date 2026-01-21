# Firebase Setup Guide for MentorMatch

This guide will walk you through setting up Firebase for the MentorMatch app, enabling cloud-based user authentication, real-time database, and data synchronization across devices.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Create Firebase Project](#create-firebase-project)
3. [Configure Firebase in the App](#configure-firebase-in-the-app)
4. [Set Up Firestore Database](#set-up-firestore-database)
5. [Set Up Authentication](#set-up-authentication)
6. [Configure Security Rules](#configure-security-rules)
7. [Testing](#testing)
8. [Migration from Local Storage](#migration-from-local-storage)

---

## Prerequisites

- Node.js and npm installed (already set up for this project)
- Firebase package installed (✅ already done)
- A Google account for Firebase Console access

---

## Create Firebase Project

### Step 1: Go to Firebase Console

1. Navigate to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**

### Step 2: Configure Project

1. **Enter project name**: `mentormatch` (or your preferred name)
2. **Google Analytics**: Enable or disable based on your preference (optional for this app)
3. Click **"Create project"** and wait for initialization

### Step 3: Add a Web App

1. In your Firebase project dashboard, click the **web icon** (`</>`) to add a web app
2. **Register app**:
   - App nickname: `MentorMatch Mobile`
   - Firebase Hosting: Not needed (uncheck)
3. Click **"Register app"**
4. **Copy the configuration object** - you'll need this in the next section

The config will look like:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "mentormatch-xxxxx.firebaseapp.com",
  projectId: "mentormatch-xxxxx",
  storageBucket: "mentormatch-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

---

## Configure Firebase in the App

### Option 1: Using Environment Variables (Recommended)

1. **Create a `.env` file** in the project root (copy from `env.example`):
   ```bash
   cp env.example .env
   ```

2. **Add your Firebase config** to `.env`:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. **Restart Expo** after creating/updating `.env`:
   ```bash
   npm run start:clear
   ```

### Option 2: Direct Configuration (For Testing)

Alternatively, you can directly edit `config/firebase.config.ts` and replace the placeholder values with your actual Firebase config values.

⚠️ **Security Note**: If you do this, make sure **not to commit** your actual API keys to a public repository.

---

## Set Up Firestore Database

### Step 1: Create Firestore Database

1. In Firebase Console, go to **Build → Firestore Database**
2. Click **"Create database"**
3. **Select location**: Choose the closest region to your users (e.g., `us-central`)
4. **Start in test mode** (for development)
   - ⚠️ **Important**: We'll update security rules later. Test mode allows all reads/writes for 30 days.
5. Click **"Enable"**

### Step 2: Understand the Data Structure

The app will create these collections:

#### `profiles` Collection
- Document ID: user email
- Fields:
  ```
  {
    id: string
    name: string
    email: string
    expertise: string
    interest: string
    expertiseYears: number
    interestYears: number
    phoneNumber: string
    createdAt: timestamp
    updatedAt: timestamp
  }
  ```

#### `mentorshipRequests` Collection
- Document ID: auto-generated request ID
- Fields:
  ```
  {
    id: string
    requesterEmail: string
    requesterName: string
    mentorEmail: string
    mentorName: string
    note: string
    status: 'pending' | 'accepted' | 'declined'
    responseNote?: string
    createdAt: timestamp
    respondedAt?: timestamp
    updatedAt?: timestamp
  }
  ```

---

## Set Up Authentication

### Step 1: Enable Email/Password Authentication

1. In Firebase Console, go to **Build → Authentication**
2. Click **"Get started"** if first time
3. Click **"Sign-in method"** tab
4. Click on **"Email/Password"**
5. **Enable** the first option (Email/Password)
6. Click **"Save"**

### Step 2: Test Authentication (Optional)

You can manually add test users in the Firebase Console:
1. Go to **Authentication → Users** tab
2. Click **"Add user"**
3. Enter email and password
4. Click **"Add user"**

---

## Configure Security Rules

⚠️ **Critical**: Before deploying to production, update your security rules!

### Firestore Security Rules

1. In Firebase Console, go to **Firestore Database → Rules**
2. Replace the default rules with:

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
      // Or requester can delete pending requests
      allow update: if isSignedIn() && 
        resource.data.mentorEmail == request.auth.token.email;
      
      allow delete: if isSignedIn() && 
        resource.data.requesterEmail == request.auth.token.email &&
        resource.data.status == 'pending';
    }
  }
}
```

3. Click **"Publish"**

### Authentication Rules

Authentication is automatically secured by Firebase - users can only access their own account data.

---

## Testing

### Test Firebase Connection

1. **Start the app**:
   ```bash
   npm start
   ```

2. **Check the logs** for Firebase initialization:
   - Look for: `Firebase initialized successfully`

3. **Create a test account**:
   - Use the app's signup flow
   - Check Firebase Console → Authentication → Users to verify the user was created

4. **Create a profile**:
   - After signup, create your profile
   - Check Firebase Console → Firestore Database → profiles to verify the data

5. **Send a mentorship request**:
   - Find another profile and send a request
   - Check Firebase Console → Firestore Database → mentorshipRequests

---

## Migration from Local Storage

The app currently uses AsyncStorage for local data persistence. Here's how to migrate:

### Phase 1: Dual Mode (Recommended)

Keep both systems running:
- New users automatically use Firebase
- Existing local data remains available
- Gradual migration of existing users

### Phase 2: Full Migration

To fully migrate to Firebase:

1. **Update authentication** in `app/login.tsx` and `app/signup.tsx`:
   ```typescript
   import { firebaseSignIn, firebaseSignUp } from '@/services/firebaseAuthService';
   ```

2. **Update profile operations** in profile screens:
   ```typescript
   import { 
     createFirebaseProfile, 
     updateFirebaseProfile,
     getFirebaseProfile 
   } from '@/services/firebaseProfileService';
   ```

3. **Update request operations** in request screens:
   ```typescript
   import {
     createFirebaseRequest,
     getFirebaseRequestsBySender,
     getFirebaseRequestsByMentor,
     acceptFirebaseRequest,
     declineFirebaseRequest
   } from '@/services/firebaseRequestService';
   ```

4. **Data migration script** (optional):
   - Export existing AsyncStorage data
   - Import to Firebase using the service functions
   - Clear local storage after successful import

---

## Troubleshooting

### Issue: "Firebase app not initialized"

**Solution**: 
- Check that `.env` file exists and has correct values
- Restart Expo dev server: `npm run start:clear`
- Verify `EXPO_PUBLIC_` prefix on all env variables

### Issue: "Permission denied" in Firestore

**Solution**:
- Check Firestore security rules
- Verify user is authenticated
- Check that request data matches security rules

### Issue: "Invalid API key"

**Solution**:
- Verify API key in `.env` matches Firebase Console
- Check for extra spaces or quotes in `.env`
- Regenerate API key in Firebase Console if needed

### Issue: Build fails with Firebase

**Solution**:
- For Expo Go: Firebase JS SDK works fine
- For custom builds: May need EAS Build configuration
- Check compatibility: `npx expo-doctor`

---

## Best Practices

1. **Environment Variables**: Always use `.env` for Firebase config, never commit secrets
2. **Security Rules**: Start with restrictive rules, then open up as needed
3. **Error Handling**: Use try-catch blocks for all Firebase operations
4. **Offline Support**: Firebase SDK has built-in offline persistence
5. **Rate Limiting**: Implement rate limiting for sensitive operations
6. **Monitoring**: Enable Firebase Analytics and Crashlytics for production

---

## Next Steps

After Firebase is set up:

1. ✅ Test signup and login with Firebase Auth
2. ✅ Test profile creation in Firestore
3. ✅ Test mentorship requests
4. 🔄 Set up Firebase Cloud Functions for advanced features (optional)
5. 🔄 Add push notifications with Firebase Cloud Messaging (optional)
6. 🔄 Set up Firebase Analytics for user insights (optional)

---

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Data Modeling Best Practices](https://firebase.google.com/docs/firestore/data-model)
- [Firebase Security Rules Guide](https://firebase.google.com/docs/rules)
- [Expo + Firebase Guide](https://docs.expo.dev/guides/using-firebase/)

---

## Support

If you encounter issues:
1. Check the [Firebase Status Dashboard](https://status.firebase.google.com/)
2. Review Expo logs: `npx expo start`
3. Check Firebase Console logs
4. Review app logs in `utils/logger.ts`

---

**🎉 You're all set!** Firebase is now integrated with MentorMatch.
