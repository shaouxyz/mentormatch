# Phone Connection Guide - Fix App Not Starting

## Quick Fix: Use Tunnel Mode

If the app won't start from your phone, use tunnel mode which works from any network:

```bash
npx expo start --tunnel
```

This creates a public URL that works from anywhere, even if your phone is on a different network.

## Alternative: Manual URL Entry

1. Start Expo normally:
   ```bash
   npm start
   ```

2. Look for the connection URL in the terminal (e.g., `exp://192.168.1.105:8081`)

3. On your phone:
   - Open **Expo Go** app
   - Tap **"Enter URL manually"** or **"Connect manually"**
   - Enter the URL from step 2
   - Tap **Connect**

## Troubleshooting

### Issue: App hangs at 100% or doesn't load

**Solution 1: Clear cache and restart**
```bash
npm start -- --clear
```

**Solution 2: Use tunnel mode**
```bash
npx expo start --tunnel
```

**Solution 3: Check network connection**
- Make sure phone and computer are on the same Wi-Fi (if using LAN mode)
- Or use tunnel mode (works from any network)

### Issue: "Unable to resolve module" errors

**Solution:**
```bash
npm start -- --clear
```

### Issue: Metro bundler stuck

**Solution:**
1. Kill the process:
   ```bash
   # Windows PowerShell
   Get-Process -Name node | Stop-Process -Force
   ```

2. Restart:
   ```bash
   npm start
   ```

### Issue: Port 8081 already in use

**Solution:**
```bash
npm run start:clear:8082
```

Then use the new port in the URL (e.g., `exp://192.168.1.105:8082`)

## Recommended Startup Command

For best results, especially on Windows:

```bash
npx expo start --tunnel --clear
```

This:
- Uses tunnel mode (works from any network)
- Clears cache (fixes module resolution issues)
- Most reliable connection method

## Verify App is Working

Once connected, you should see:
1. App loads on phone
2. Welcome screen appears
3. No hanging or freezing
4. Logs appear in terminal showing `[APP_INIT]` messages

If you see errors in the terminal, check:
- Network connectivity
- Firewall settings
- Node.js version (should be Node 20 LTS)
