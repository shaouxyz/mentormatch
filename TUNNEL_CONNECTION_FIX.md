# Fix: "ngrok tunnel took too long to connect"

## Error
```
CommandError: ngrok tunnel took too long to connect.
```

This happens when Expo's tunnel service (ngrok) can't establish a connection quickly enough.

## Quick Solutions

### Solution 1: Use LAN Mode (Recommended if on same network)

If your phone and computer are on the **same Wi-Fi network**, use LAN mode instead:

```bash
npx expo start --clear
```

Then:
1. Look for the connection URL in terminal (e.g., `exp://192.168.1.105:8081`)
2. Open **Expo Go** on your phone
3. Tap **"Enter URL manually"** or **"Connect manually"**
4. Enter the URL from step 1
5. Tap **Connect**

### Solution 2: Retry Tunnel Mode

Sometimes tunnel mode just needs a retry:

```bash
# Wait a moment, then try again
npx expo start --tunnel --clear
```

If it still fails, try:
```bash
# Use a different tunnel provider
EXPO_NO_DOTENV=1 npx expo start --tunnel --clear
```

### Solution 3: Check Network/Firewall

1. **Check internet connection**: Tunnel mode requires internet
2. **Check firewall**: Windows Firewall might be blocking ngrok
   - Temporarily disable firewall to test
   - Or allow Node.js through firewall
3. **Try different network**: Switch to different Wi-Fi or use mobile hotspot

### Solution 4: Use Manual IP Address

If you know your computer's IP address:

1. Start Expo normally:
   ```bash
   npx expo start --clear
   ```

2. Find your IP address:
   ```powershell
   # Windows PowerShell
   ipconfig | findstr IPv4
   ```

3. Use the IP in the connection URL:
   ```
   exp://YOUR_IP_ADDRESS:8081
   ```

### Solution 5: Use Development Build

If Expo Go continues to have issues:

```bash
npx expo start --dev-client
```

This uses a different connection method that's more reliable.

## Recommended Approach

**For same network (phone and computer on same Wi-Fi):**
```bash
npx expo start --clear
```
Then manually enter the URL shown in terminal.

**For different networks:**
1. First try tunnel mode again (sometimes it works on retry)
2. If tunnel fails, use a mobile hotspot to put both devices on same network
3. Then use LAN mode

## Verify Connection

After connecting, you should see:
- ✅ App loads on phone
- ✅ Welcome screen appears
- ✅ Terminal shows connection logs
- ✅ No error messages

## Still Having Issues?

1. **Check Expo Go version**: Update to latest version
2. **Restart everything**: Close Expo Go, stop server (Ctrl+C), restart
3. **Clear all caches**:
   ```bash
   npx expo start --clear
   rm -rf node_modules/.cache
   ```
4. **Check terminal logs**: Look for any error messages

---

**Most likely solution**: Use LAN mode (`npx expo start --clear`) and manually enter the URL if you're on the same network.
