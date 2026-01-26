# Firestore Index Query Scope

## For the `conversations` Index:

### Select: **Collection** ✅

## Why?

**Collection** = Query within a single collection (what you need)
- Your query is: `where('participants', 'array-contains', userEmail) orderBy('updatedAt', 'desc')`
- This queries the `conversations` collection only
- This is the standard case

**Collection Group** = Query across multiple collections with the same name
- Used for subcollections (e.g., querying `messages` across all subcollections)
- Not needed for your use case

## Complete Index Settings:

1. **Collection ID**: `conversations`
2. **Field 1**: `participants` → **Array**
3. **Field 2**: `updatedAt` → **Descending**
4. **Query scope**: **Collection** ✅
5. Click **"Create"**

## Quick Answer:
**Always select "Collection" for this index.**
