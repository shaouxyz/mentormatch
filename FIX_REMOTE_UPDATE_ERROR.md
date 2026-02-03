# Fix: "Failed to download remote update" Error

## Error Message
```
Uncaught Error: java.io.IOException: Failed to download remote update
```

This error means your phone cannot connect to the Metro bundler server.

## Quick Fixes (Try in Order)

### Fix 1: Use Tunnel Mode (Most Reliable)
Tunnel mode works from any network and bypasses most connectivity issues:

```bash
npx expo start --tunnel --clear
```

Then scan the QR code or enter the tunnel URL manually in Expo Go.

### Fix 2: Check Metro Bundler is Running
Make sure the dev server is actually running:

```bash
npm start
```

You should see:
```
› Metro waiting on exp://...
› Scan the QR code above with Expo Go
```

If you don't see this, the server isn't running.

### Fix 3: Clear Cache and Restart
Clear all caches and restart:

```bash
npm start -- --clear
```

Or manually:
```bash
# Clear Metro cache
npx expo start --clear

# Clear npm cache (if needed)
npm cache clean --force

# Reinstall dependencies (if needed)
rm -rf node_modules
npm install
```

### Fix 4: Check Network Connection
1. **Same Wi-Fi**: If using LAN mode, ensure phone and computer are on the same Wi-Fi network
2. **Firewall**: Windows Firewall might be blocking port 8081
   - Allow Node.js through firewall
   - Or temporarily disable firewall to test
3. **Try Different Port**: If 8081 is blocked:
   ```bash
   npm run start:clear:8082
   ```
   Then use the new port in the URL

### Fix 5: Manual URL Entry
Instead of scanning QR code:

1. Start Expo: `npm start`
2. Look for the connection URL in terminal (e.g., `exp://192.168.1.105:8081`)
3. Open Expo Go on phone
4. Tap "Enter URL manually"
5. Enter the exact URL from terminal

### Fix 6: Check Phone Settings
1. **Airplane Mode**: Make sure airplane mode is OFF
2. **Wi-Fi**: Ensure Wi-Fi is connected
3. **Data**: If using tunnel mode, cellular data should work
4. **Expo Go Version**: Update Expo Go app to latest version

### Fix 7: Restart Everything
1. Stop Expo server (Ctrl+C)
2. Close Expo Go app on phone
3. Restart Expo: `npm start -- --clear`
4. Reopen Expo Go and try again

### Fix 8: Use Development Build
If Expo Go continues to fail, try a development build:

```bash
npx expo start --dev-client
```

## Most Common Causes

1. **Metro bundler not running** - Server must be active
2. **Network connectivity** - Phone can't reach computer
3. **Firewall blocking** - Windows Firewall blocking port 8081
4. **Wrong URL** - Using incorrect connection URL
5. **Cache issues** - Stale cache causing connection problems

## Recommended Solution

**For best results, use tunnel mode:**

```bash
npx expo start --tunnel --clear
```

This:
- ✅ Works from any network (phone doesn't need same Wi-Fi)
- ✅ Bypasses firewall issues
- ✅ Most reliable connection method
- ✅ Clears cache automatically

## Verify It's Working

After connecting, you should see:
1. App loads on phone
2. Welcome screen appears
3. Terminal shows connection logs
4. No error messages

## Still Not Working?

If none of these work:

1. **Check Expo Go logs**: Shake phone → "Show Dev Menu" → "Debug Remote JS"
2. **Check terminal logs**: Look for error messages in the Expo output
3. **Try different network**: Switch to different Wi-Fi or use cellular data with tunnel mode
4. **Reinstall Expo Go**: Uninstall and reinstall Expo Go app on phone

---

**Most likely fix**: Use `npx expo start --tunnel --clear` and scan the new QR code.
