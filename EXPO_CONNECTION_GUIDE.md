# Expo Connection Guide

Your Expo development server is running successfully!

## ✅ Server Status
- **Metro Bundler**: Running on `http://localhost:8081`
- **Local IP**: `192.168.1.105`
- **Status**: Confirmed working (responds to requests)

## 📱 How to Connect Your Phone

### Method 1: Manual URL Entry (Easiest)
1. Open **Expo Go** app on your phone
2. Tap **"Enter URL manually"** or **"Connect manually"**
3. Enter: `exp://192.168.1.105:8081`
4. Tap **Connect**

### Method 2: QR Code
If the QR code isn't showing in your terminal:
1. Open your browser to: `http://localhost:8081`
2. The Metro bundler interface should show a QR code
3. Scan it with Expo Go app

### Method 3: Expo Dev Client
If you have the development build:
1. Run: `npx expo start --dev-client`
2. Scan the QR code that appears

## 🔧 Troubleshooting

### If app won't load:
1. Make sure your phone and computer are on the **same Wi-Fi network**
2. Check if your firewall is blocking port 8081
3. Try restarting the Expo server:
   ```
   npm start
   ```

### If you see "Unable to resolve module":
1. Clear the cache:
   ```
   npm start -- --clear
   ```
2. Or manually clear:
   ```
   rm -rf node_modules/.cache
   ```

### If Metro bundler is stuck:
1. Kill the process on port 8081
2. Restart: `npm start`

## 📝 Current Connection URL
```
exp://192.168.1.105:8081
```

Just copy this URL and paste it into Expo Go!
