# Node 20 LTS Switch Complete

## Current Status

- **Previous**: Node v25.2.1 from Miniconda (incompatible)
- **Current**: Node 20 LTS from `C:\Program Files\nodejs\` ✅
- **Tests**: ✅ All passing (52 suites, 1533 tests)

## What Was Done

1. ✅ Node 20 LTS is installed in `C:\Program Files\nodejs\`
2. ✅ PATH updated in current session to prioritize official Node over Miniconda
3. ✅ All tests passing with Node 20
4. ✅ Dependencies compatible

## Important: Make PATH Change Permanent

The PATH change in this session is temporary. To make it permanent:

### Option 1: System Environment Variables (Recommended)

1. Open **System Properties**:
   - Press `Win + R`
   - Type: `sysdm.cpl`
   - Press Enter

2. Go to **Advanced** tab → **Environment Variables**

3. Under **System variables**, find **Path** and click **Edit**

4. **Move** `C:\Program Files\nodejs` to the **top** of the list (or at least above Miniconda paths)

5. Click **OK** on all dialogs

6. **Restart Cursor/IDE** and all terminal windows

### Option 2: PowerShell Profile (Session-based)

Add to your PowerShell profile (`$PROFILE`):

```powershell
$env:PATH = "C:\Program Files\nodejs;" + ($env:PATH -replace "C:\\Users\\Chunlin Wang\\Miniconda3[^;]*;?", "")
```

## Verify It's Working

After restarting:

```powershell
node --version
# Should show: v20.x.x (NOT v25.2.1)

Get-Command node | Select-Object -ExpandProperty Source
# Should show: C:\Program Files\nodejs\node.exe (NOT Miniconda)
```

## Using Expo Now

```powershell
cd C:\Proj\cmn
npm start
# Or with tunnel mode:
npx expo start --tunnel --clear
```

## Benefits of Node 20 LTS

- ✅ Better compatibility with Expo
- ✅ More stable with React Native tooling
- ✅ Long-term support
- ✅ Recommended by project README
- ✅ Avoids compatibility issues with Node 25.x

---

**Status**: ✅ **NODE 20 LTS IS ACTIVE!** All tests passing. Remember to make PATH change permanent.
