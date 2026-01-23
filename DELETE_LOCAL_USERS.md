# Delete Local User Accounts

If you want to remove users from local storage (not just Firebase):

## Option 1: Through the App (Recommended)

Currently there's no delete account feature in the app UI. You can:
1. Log out
2. Sign up fresh with the email you want
3. The new account will work

## Option 2: Clear All App Data

**On Android:**
1. Go to Settings → Apps → Expo Go
2. Tap "Storage"
3. Tap "Clear Data" or "Clear Storage"
4. This wipes everything - you'll need to sign up again

**On iOS:**
1. Uninstall Expo Go
2. Reinstall from App Store
3. Sign up again

## Option 3: Manual Developer Clear (Advanced)

Add this temporary code to clear specific users:

```typescript
// Add to app/index.tsx temporarily
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clear users
AsyncStorage.getItem('users').then(data => {
  if (data) {
    const users = JSON.parse(data);
    const filtered = users.filter(
      u => u.email !== 'shaouxyz@hotmail.com' && u.email !== 'shaouxyz@gmail.com'
    );
    AsyncStorage.setItem('users', JSON.stringify(filtered));
  }
});

// Clear profiles
AsyncStorage.getItem('allProfiles').then(data => {
  if (data) {
    const profiles = JSON.parse(data);
    const filtered = profiles.filter(
      p => p.email !== 'shaouxyz@hotmail.com' && p.email !== 'shaouxyz@gmail.com'
    );
    AsyncStorage.setItem('allProfiles', JSON.stringify(filtered));
  }
});
```

Then remove this code after running once.

## What You Should Do

**For your use case:**
1. ✅ Delete users in Firebase Console (do this)
2. ⚠️ Leave local data alone (it won't interfere)
3. ✅ Sign up fresh with the emails you want

The Firebase deletion is what matters most!
