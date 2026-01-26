# Simple Firestore Index Creation

## The UI Shows One Dropdown Per Field

Each field has a single dropdown with options: **Ascending**, **Descending**, or **Array**

## Correct Settings:

### Collection ID:
```
conversations
```

### Field 1: `participants`
- **Field path**: `participants`
- **Dropdown**: Select **"Array"**

### Field 2: `updatedAt`
- **Field path**: `updatedAt`
- **Dropdown**: Select **"Descending"**

## That's It!

1. Collection: `conversations`
2. Field 1: `participants` → **Array**
3. Field 2: `updatedAt` → **Descending**
4. Click "Create"

## Why This Works:

- **Array** for `participants` allows the `array-contains` query to work
- **Descending** for `updatedAt` allows sorting newest first

No need to worry about "String" or "Timestamp" - just select **"Descending"** for `updatedAt`!
