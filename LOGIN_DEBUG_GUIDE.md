# Login Debug Guide for shaouxyz@gmail.com

## Issue
User `shaouxyz@gmail.com` cannot login to Expo Go from phone.

## How Login Works

The login flow uses a **hybrid authentication system** that:
1. **First tries Firebase** (if configured)
2. **Falls back to local storage** if Firebase fails
3. **Creates Firebase account** if user exists locally but not in Firebase

## Debugging Steps

### Step 1: Check Firebase Configuration

The app checks if Firebase is configured by looking at:
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

**To check:**
1. Look at the terminal/console logs when the app starts
2. Look for: `[FIREBASE] Initialization complete` or `Firebase not configured`
3. Check if environment variables are set in `.env` file

### Step 2: Check Login Flow

When you try to login, the app will:
1. Try Firebase authentication first (if configured)
2. If Firebase fails, try local authentication
3. If user exists locally but not in Firebase, create Firebase account

**What to look for in logs:**
- `Attempting Firebase signin first` - Firebase is being tried
- `Firebase signin failed, trying local authentication` - Firebase failed, using local
- `User authenticated locally` - Login succeeded via local storage
- `Firebase account created for existing local user` - User was created in Firebase

### Step 3: Common Issues and Fixes

#### Issue 1: User doesn't exist in Firebase
**Symptoms:**
- Error code: `auth/user-not-found` or `auth/invalid-credential`
- Login fails even with correct password

**Fix:**
- The app should automatically create the Firebase account if user exists locally
- If this fails, you can:
  - Sign up again with the same email (will create Firebase account)
  - Or manually add user in Firebase Console

#### Issue 2: Wrong password
**Symptoms:**
- Error code: `auth/wrong-password`
- Login fails

**Fix:**
- Check if password is correct
- If user was created before Firebase integration, the password might be different
- Try resetting password or signing up again

#### Issue 3: Firebase not configured
**Symptoms:**
- Logs show: `Firebase not configured, using local storage only`
- Login works but only uses local storage

**Fix:**
- Set environment variables in `.env` file
- Restart Expo server

#### Issue 4: Network issues
**Symptoms:**
- Error code: `auth/network-request-failed`
- Login times out

**Fix:**
- Check internet connection
- Try using tunnel mode: `npx expo start --tunnel`

## Enhanced Error Messages

The app now provides better error messages:
- **"Email not found"** - User doesn't exist, need to sign up
- **"Incorrect password"** - Wrong password
- **"Invalid email or password"** - General credential error
- **"Network error"** - Connection issue
- **"Too many login attempts"** - Rate limited

## What Was Fixed

1. **Better error logging** - All errors now include Firebase error codes
2. **User-friendly error messages** - Specific messages for different error types
3. **Automatic Firebase account creation** - If user exists locally but not in Firebase
4. **Improved fallback** - Better handling when Firebase fails
5. **Diagnostic logging** - More detailed logs to help debug issues

## Next Steps

1. **Try logging in again** and check the console/terminal logs
2. **Look for the specific error code** (e.g., `auth/user-not-found`)
3. **Check if Firebase is configured** by looking for initialization logs
4. **Share the error message** you see on the phone or in the logs

The login should now work even if Firebase fails, as it falls back to local authentication. If you see a specific error, share it and we can fix it!
