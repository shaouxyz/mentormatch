# Switch to Node 20 LTS - Quick Guide

## Current Problem
You're using **Node v25.2.1 from Miniconda**, which is incompatible with Expo SDK 54.

## Solution: Install Node 20 LTS Directly

### Option 1: Using winget (Easiest - if available)

```powershell
# Install Node 20 LTS
winget install OpenJS.NodeJS.LTS

# Verify installation
node -v
# Should show: v20.x.x (not v25.2.1)
```

### Option 2: Manual Download (If winget doesn't work)

1. **Download Node 20 LTS**:
   - Go to: https://nodejs.org/en/download/
   - Download **Windows Installer (.msi)** for **LTS version** (should be v20.x.x)

2. **Install**:
   - Run the installer
   - **Important**: Check "Add to PATH" during installation
   - Complete installation

3. **Verify**:
   ```powershell
   node -v
   # Should show: v20.x.x
   ```

### Option 3: Remove Node from Miniconda (After installing Node 20)

After Node 20 is installed, remove Miniconda's Node to avoid conflicts:

```powershell
conda uninstall nodejs
```

## Fix PATH Priority (If Node 20 still doesn't work)

If `node -v` still shows v25.2.1 after installing Node 20:

1. **Check where Node 20 was installed** (usually `C:\Program Files\nodejs\`)

2. **Move Node 20 path BEFORE Miniconda in PATH**:
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Go to "Advanced" tab → "Environment Variables"
   - Under "User variables" or "System variables", find "Path"
   - Edit Path
   - Find `C:\Program Files\nodejs\` (or wherever Node 20 installed)
   - **Move it ABOVE** all Miniconda paths
   - Click OK on all dialogs

3. **Restart PowerShell/Cursor** completely

4. **Verify**:
   ```powershell
   node -v
   Get-Command node | Select-Object -ExpandProperty Source
   # Should show: C:\Program Files\nodejs\node.exe (NOT Miniconda)
   ```

## After Switching to Node 20

```powershell
# Navigate to project
cd C:\Proj\cmn

# Reinstall dependencies (important!)
npm install

# Start Expo
npm run start:clear:8082
```

## Troubleshooting

### If `node -v` still shows v25.2.1:
- Close ALL PowerShell/terminal windows
- Restart Cursor completely
- Check PATH order (Node 20 must come before Miniconda)

### If npm commands fail:
- Run: `npm install -g npm@latest`
- Verify: `npm -v` should show v10.x or v11.x

### If Expo still fails:
- Share the exact error message
- Run: `npx expo-doctor` and share output
