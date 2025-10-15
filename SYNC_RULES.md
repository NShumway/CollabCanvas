# CollabCanvas Sync Architecture Rules

**CRITICAL: Read this document before working with any sync-related code.**

This document defines the bulletproof sync architecture that prevents infinite loops, echo effects, race conditions, and ghost objects that plagued our first implementation attempt.

## Core Architecture Principles

### 1. Strict Write/Read Path Separation

**NEVER mix write and read operations in the same function or component.**

#### Write Path (syncEngine.js)
- **Purpose:** Handle all writes TO Firestore
- **Files:** `src/services/syncEngine.js`
- **Operations:** `applyLocalChange()`, `queueWrite()`, `flushWrites()`
- **Rule:** NEVER add listeners or read operations to this file

#### Read Path (useFirestoreSync.js)
- **Purpose:** Handle all reads FROM Firestore  
- **Files:** `src/hooks/useFirestoreSync.js`
- **Operations:** `onSnapshot` listener, echo prevention, conflict resolution
- **Rule:** NEVER add write operations to this file

### 2. Echo Prevention (Critical)

Every Firestore listener update must pass through TWO echo prevention checks:

#### Check #1: hasPendingWrites Metadata
```javascript
if (change.doc.metadata.hasPendingWrites) {
  console.log('🔄 Skipping echo (hasPendingWrites):', id);
  return;
}
```

#### Check #2: Local Pending Writes Map
```javascript
if (hasPendingWrite(id)) {
  console.log('🔄 Skipping echo (in pendingWrites):', id);
  return;
}
```

**Why Two Checks?** Firestore metadata isn't always reliable during network issues. Our local pending writes map provides backup protection.

### 3. Timestamp-Based Conflict Resolution

Always use server timestamps as the authority:

```javascript
// Only update if remote timestamp is newer than local
if (existingShape && remoteTimestamp <= localTimestamp) {
  console.log('⏰ Skipping stale remote update');
  return;
}
```

### 4. Three-Tier State Architecture

Our Zustand store has three tiers of state:

#### Tier 1: Rendering State (What Users See)
- `shapes: {}` - All shapes on canvas
- `selectedIds: []` - Currently selected shapes  
- `viewport: { x, y, zoom }` - Canvas viewport
- `users: {}` - Other users (cursors, presence)

#### Tier 2: Sync Tracking (Prevents Echo Loops)
- `pendingWrites: {}` - Tracks shapes with uncommitted writes
- `currentUser: null` - Authenticated user info

#### Tier 3: Connection State (Network Monitoring)
- `connectionState: 'connected'` - Connection status
- `lastSyncTimestamp: 0` - Last successful sync

## Sync Flow (Step by Step)

### Creating a Shape
1. User clicks canvas → `handleStageClick()` in Canvas.jsx
2. **Write Path:** `syncEngine.applyLocalChange()` → Updates Zustand immediately
3. **Write Path:** `syncEngine.queueWrite()` → Marks pending, queues Firestore write
4. **Write Path:** `syncEngine.flushWrites()` → Batch commits to Firestore
5. **Read Path:** `useFirestoreSync` listener receives change
6. **Read Path:** Echo prevention checks pass/fail
7. **Read Path:** If legitimate remote change, update Zustand

### Dragging a Shape
1. User drags shape → `handleDragMove()` in Shape.jsx
2. **Write Path:** `syncEngine.applyLocalChange()` → Updates Zustand immediately (60fps)
3. **Write Path:** `syncEngine.queueWrite(debounced=true)` → Batches rapid updates
4. On drag end → `syncEngine.queueWrite(immediate=true)` → Flushes immediately
5. **Read Path:** Same as above, but debounced writes reduce Firestore calls

## Critical Rules

### ❌ NEVER DO THESE (Will Break Sync)

1. **Don't update Zustand inside Firestore write callbacks**
   ```javascript
   // ❌ WRONG - Creates infinite loops
   await setDoc(shapeRef, data);
   updateShape(id, data); // NO!
   ```

2. **Don't mix write and read paths**
   ```javascript
   // ❌ WRONG - Same function does both
   const syncShape = async (shape) => {
     updateShape(shape.id, shape); // Local update
     await writeShape(shape);      // Firestore write
   }
   ```

3. **Don't skip echo prevention checks**
   ```javascript
   // ❌ WRONG - Always check for echoes
   changes.forEach(change => {
     updateShape(change.id, change.data); // NO!
   });
   ```

4. **Don't use client timestamps for conflict resolution**
   ```javascript
   // ❌ WRONG - Client clocks can be wrong
   if (remoteShape.clientTimestamp > localShape.clientTimestamp)
   
   // ✅ CORRECT - Server timestamps are authoritative
   if (remoteShape.updatedAt > localShape.updatedAt)
   ```

### ✅ ALWAYS DO THESE (Bulletproof Sync)

1. **Always check hasPendingWrites AND pendingWrites map**
2. **Always use server timestamps (serverTimestamp()) for Firestore writes**
3. **Always update local state immediately for 60fps UX**
4. **Always queue writes through SyncEngine, never direct Firestore calls**
5. **Always handle errors gracefully (network issues are common)**

## File Responsibilities

### src/services/syncEngine.js
- ✅ Local state updates (`applyLocalChange`)
- ✅ Write queuing and batching
- ✅ Firestore batch writes
- ❌ NO listeners or read operations

### src/hooks/useFirestoreSync.js  
- ✅ Firestore onSnapshot listener
- ✅ Echo prevention logic
- ✅ Timestamp-based conflict resolution
- ❌ NO write operations

### src/components/Canvas/Canvas.jsx
- ✅ User interactions (click, drag)
- ✅ Calls SyncEngine for writes
- ✅ Uses useFirestoreSync for reads
- ❌ NO direct Firestore operations

### src/components/Canvas/Shape.jsx
- ✅ Shape rendering and events
- ✅ Calls SyncEngine for position updates
- ❌ NO direct Firestore operations

## Testing Protocol

After any sync changes, ALWAYS test with 2+ browsers:

1. **Create shapes simultaneously** - No duplicates should appear
2. **Drag same shape in both browsers** - Should sync smoothly  
3. **Check browser console** - No infinite loops or errors
4. **Refresh browsers** - State should persist correctly
5. **Test network interruption** - Should reconnect gracefully

## Common Bugs and Solutions

### Infinite Loops
- **Cause:** Firestore write triggers listener update triggers local update
- **Solution:** Check both echo prevention mechanisms
- **Detection:** CPU spikes, console spam, browser freezes

### Ghost Objects  
- **Cause:** Race condition between create and sync
- **Solution:** Use pending writes map correctly
- **Detection:** Duplicate shapes appearing/disappearing

### Stale Data
- **Cause:** Not checking timestamps properly
- **Solution:** Always compare server timestamps
- **Detection:** Old changes overwriting new changes

### Performance Issues
- **Cause:** Too many Firestore writes during drag
- **Solution:** Use debounced writes during continuous operations
- **Detection:** High Firestore usage, slow sync

## Architecture Evolution

This is our **second attempt** at sync architecture. The first attempt failed because:

1. ❌ Mixed write and read paths in same hooks
2. ❌ Insufficient echo prevention  
3. ❌ Race conditions between local and remote updates
4. ❌ No clear separation of concerns

The current architecture fixes all these issues through:

1. ✅ Strict write/read path separation
2. ✅ Bulletproof echo prevention (two-layer checks)
3. ✅ Server timestamp authority for conflict resolution
4. ✅ Clean separation of concerns across files

## When Working on Sync Code

1. **Read this document first** - Every time
2. **Reference the specific rules** - While coding
3. **Test with 2 browsers** - After every change
4. **Monitor console logs** - For echo prevention messages
5. **Watch CPU usage** - For infinite loop detection

**Remember: Sync architecture is the foundation of multiplayer functionality. Get it wrong and everything breaks. Get it right and everything just works.**
