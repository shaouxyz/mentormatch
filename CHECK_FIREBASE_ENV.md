# Check Firebase Environment Variables

## Quick Check

Run this command to check if Firebase environment variables are configured:

```bash
node -e "const vars = ['EXPO_PUBLIC_FIREBASE_API_KEY', 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'EXPO_PUBLIC_FIREBASE_APP_ID']; vars.forEach(v => console.log(v + ':', process.env[v] ? 'SET' : 'NOT SET'));"
```

## Required Variables

The following environment variables must be set for Firebase to work:

1. `EXPO_PUBLIC_FIREBASE_API_KEY` - Firebase API Key
2. `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase Auth Domain (usually `your-project.firebaseapp.com`)
3. `EXPO_PUBLIC_FIREBASE_PROJECT_ID` - Firebase Project ID
4. `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase Storage Bucket (usually `your-project.appspot.com`)
5. `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase Messaging Sender ID
6. `EXPO_PUBLIC_FIREBASE_APP_ID` - Firebase App ID

## How to Get Firebase Config Values

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create one if you haven't)
3. Click the gear icon ⚙️ next to "Project Overview"
4. Select "Project settings"
5. Scroll down to "Your apps" section
6. If you don't have a web app, click "Add app" and select the web icon (</>)
7. Copy the `firebaseConfig` object values

## Setup for Local Development

1. **Create `.env` file** (if it doesn't exist):
   ```bash
   cp env.example .env
   ```

2. **Edit `.env` file** and fill in your Firebase values:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

3. **Restart your development server** after creating/updating `.env`

## Setup for EAS Builds

You have two options for EAS builds:

### Option 1: EAS Secrets (Recommended)

Use EAS secrets to store environment variables securely:

```bash
# Set each variable
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your-api-key"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "your-project.firebaseapp.com"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "your-project-id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "your-project.appspot.com"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "123456789"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "1:123456789:web:abc123"
```

**View existing secrets:**
```bash
eas secret:list
```

**Delete a secret:**
```bash
eas secret:delete --name EXPO_PUBLIC_FIREBASE_API_KEY
```

### Option 2: eas.json (Less Secure)

Add environment variables directly to `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "NPM_CONFIG_LEGACY_PEER_DEPS": "true",
        "EXPO_PUBLIC_FIREBASE_API_KEY": "your-api-key",
        "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "your-project.firebaseapp.com",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "your-project-id",
        "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET": "your-project.appspot.com",
        "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "123456789",
        "EXPO_PUBLIC_FIREBASE_APP_ID": "1:123456789:web:abc123"
      }
    },
    "preview": {
      "env": {
        "NPM_CONFIG_LEGACY_PEER_DEPS": "true",
        "EXPO_PUBLIC_FIREBASE_API_KEY": "your-api-key",
        "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "your-project.firebaseapp.com",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "your-project-id",
        "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET": "your-project.appspot.com",
        "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "123456789",
        "EXPO_PUBLIC_FIREBASE_APP_ID": "1:123456789:web:abc123"
      }
    }
  }
}
```

⚠️ **Warning**: Don't commit `eas.json` with real secrets to git! Use EAS secrets instead.

## Verify Configuration

### Check if variables are set locally:

```bash
# Check if .env file exists
ls -la .env

# View .env file (be careful not to expose secrets)
cat .env
```

### Check EAS secrets:

```bash
eas secret:list
```

### Test Firebase connection:

1. Start the app in development mode
2. Check the console logs for Firebase initialization messages
3. Look for errors like "Firebase not configured" or "Firebase initialized successfully"

## Current Status Check

Run this to see which variables are currently set:

```bash
# Check local .env (if exists)
if [ -f .env ]; then
  echo "=== Local .env file ==="
  grep EXPO_PUBLIC_FIREBASE .env | sed 's/=.*/=***HIDDEN***/'
else
  echo "No .env file found"
fi

# Check EAS secrets
echo ""
echo "=== EAS Secrets ==="
eas secret:list | grep EXPO_PUBLIC_FIREBASE || echo "No Firebase secrets found"
```

## Troubleshooting

### Issue: Firebase not initializing in EAS build

**Solution:**
1. Verify secrets are set: `eas secret:list`
2. Rebuild the app: `eas build --platform android --profile production`
3. Check build logs for environment variable errors

### Issue: Variables not loading in development

**Solution:**
1. Ensure `.env` file exists in project root
2. Restart Expo dev server after creating/updating `.env`
3. Check that variable names start with `EXPO_PUBLIC_`

### Issue: "Firebase not configured" error

**Solution:**
1. Check that all 6 required variables are set
2. Verify values are correct (not placeholders)
3. Check Firebase Console to ensure project exists

## Security Notes

- ✅ `.env` is in `.gitignore` (should not be committed)
- ✅ EAS secrets are encrypted and secure
- ⚠️ Don't commit real Firebase config to `eas.json`
- ⚠️ Don't share Firebase API keys publicly

## Next Steps

After setting up environment variables:

1. **Test locally**: Run `npm start` and verify Firebase initializes
2. **Check logs**: Look for "Firebase initialized successfully" message
3. **Test EAS build**: Run `eas build --platform android --profile production`
4. **Verify in app**: Check that profiles sync from Firestore
