# When to Reload vs Restart Expo Server

## Quick Answer

**For most code changes (like the meeting respond screen fix):**
- ✅ **Just reload the app** - Press `r` in terminal or shake device → "Reload"
- ❌ **No need to restart server** - Metro bundler will pick up changes automatically

**Only restart server if:**
- ❌ Module import errors (e.g., "Cannot find module")
- ❌ Server crashed or stopped responding
- ❌ Configuration file changes (e.g., `app.json`, `package.json`)
- ❌ Native module changes (rare)

## How to Reload App

### Option 1: Terminal (Fastest)
1. Go to terminal where Expo is running
2. Press `r` key
3. App will reload automatically

### Option 2: Expo Go App
1. Shake your phone (or press Ctrl+M on emulator)
2. Tap "Reload"

### Option 3: Expo Dev Menu
1. Shake phone → "Show Dev Menu"
2. Tap "Reload"

## When to Restart Server

### Restart if you see these errors:

1. **Module not found:**
   ```
   Error: Cannot find module '@/services/...'
   ```
   → Restart: `Ctrl+C` then `npm start -- --clear`

2. **Metro bundler crashed:**
   ```
   Error: Metro bundler process exited
   ```
   → Restart: `Ctrl+C` then `npm start -- --clear`

3. **Port already in use:**
   ```
   Error: Port 8081 is already in use
   ```
   → Kill process: `netstat -ano | findstr :8081` then kill PID
   → Or use different port: `npm run start:clear:8082`

4. **Configuration changes:**
   - Changed `app.json`
   - Changed `package.json` dependencies
   - Changed `babel.config.js` or `metro.config.js`
   → Restart: `Ctrl+C` then `npm start -- --clear`

## For Your Recent Change (Meeting Respond Screen)

Since we only changed:
- `app/meeting/respond.tsx` (React component)
- `app/__tests__/meeting.respond.test.tsx` (test file)

**You only need to:**
1. ✅ Press `r` in terminal (or reload in Expo Go)
2. ✅ Test the meeting respond screen

**No server restart needed!**

## If You're Seeing an Error

Please share:
1. The exact error message from terminal
2. Where it appears (terminal, phone, or both)
3. When it happens (on app load, specific action, etc.)

Then I can provide a specific fix.
