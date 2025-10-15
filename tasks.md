## PR #2: Zustand Store & Auth
**User Stories:** Setup story 5-6, Designer story 7  
**Goal:** Set up state management and Google authentication

### Tasks:
1. **Create Zustand store structure**
   - **Create:** `src/store/canvasStore.js`
   - Define state: 
     - `shapes: {}` - all shapes on canvas
     - `selectedIds: []` - currently selected shape IDs
     - `viewport: { x, y, zoom }` - canvas viewport
     - `users: {}` - other users (cursors, presence)
     - `currentUser: null` - authenticated user
     - `pendingWrites: {}` - tracks shapes with uncommitted Firestore writes
     - `connectionState: 'connected'` - connection status
     - `lastSyncTimestamp: 0` - last successful sync
   - Create actions: `setShapes`, `updateShape`, `addShape`, `removeShape`, `setViewport`, `setCurrentUser`, `setSelectedIds`, `addPendingWrite`, `removePendingWrite`, `setConnectionState`

2. **Build Google OAuth login**
   - **Create:** `src/components/Auth/LoginButton.jsx`
   - Implement `signInWithPopup` with GoogleAuthProvider
   - Add loading and error states
   - Style button with Tailwind

3. **Create auth state hook**
   - **Create:** `src/hooks/useAuth.js`
   - Listen to `onAuthStateChanged`
   - Extract display name from email (use email prefix)
   - Update Zustand store with current user

4. **Build auth guard**
   - **Create:** `src/components/Auth/AuthGuard.jsx`
   - Show login screen if not authenticated
   - Show main app if authenticated
   - Add sign-out button

5. **Update App.jsx**
   - **Edit:** `src/App.jsx`
   - Wrap app with AuthGuard
   - Call useAuth hook

**Files Created:**
- `src/store/canvasStore.js`
- `src/components/Auth/LoginButton.jsx`
- `src/hooks/useAuth.js`
- `src/components/Auth/AuthGuard.jsx`

**Files Edited:**
- `src/App# CollabCanvas - Task List by PR

## Overview
Tasks organized by Pull Request, ordered by user stories from the PRD. Each PR represents a logical unit of work that can be tested independently.

---

## PR #1: Project Setup & Initial Deployment
**User Stories:** Setup stories 1-4  
**Goal:** Get basic project scaffolding deployed to verify infrastructure works

### Tasks:
1. **Initialize React + Vite project**
   - Run `npm create vite@latest collabcanvas -- --template react`
   - Install dependencies: `react-konva konva zustand firebase @anthropic-ai/sdk tailwindcss`

2. **Configure Tailwind CSS**
   - Run `npx tailwindcss init -p`
   - Update `tailwind.config.js`
   - Add Tailwind directives to `src/index.css`

3. **Set up folder structure**
   ```
   src/
     components/
       Auth/
       Canvas/
       UI/
     store/
     services/
     hooks/
     utils/
   ```

4. **Create Firebase project**
   - Create project in Firebase Console
   - Enable Firestore (test mode)
   - Enable Authentication (Google provider)
   - Get config credentials

5. **Configure environment variables**
   - Create `.env.local` with Firebase keys and Anthropic API key
   - Add `.env.local` to `.gitignore`

6. **Set up Firebase service**
   - **Create:** `src/services/firebase.js`
   - Initialize Firebase app, export `auth` and `db`

7. **Deploy "Hello World"**
   - Build project: `npm run build`
   - Deploy to Firebase Hosting or Vercel
   - Verify public URL works
   - Update README with deployment URL

**Files Created:**
- `src/services/firebase.js`
- `.env.local`
- `tailwind.config.js`

**Acceptance:** Public URL loads, Firebase connected, Tailwind works

---

## PR #2: Zustand Store & Auth
**User Stories:** Setup story 5-6, Designer story 7  
**Goal:** Set up state management and Google authentication

### Tasks:
1. **Create Zustand store structure with three-tier system**
   - **Create:** `src/store/canvasStore.js`
   - Define state: 
     - Tier 1 (Rendering): `shapes: {}`, `selectedIds: []`, `viewport: { x, y, zoom }`, `users: {}`
     - Tier 2 (Sync tracking): `pendingWrites: {}`, `currentUser: null`
     - Tier 3 (Connection): `connectionState: 'connected'`, `lastSyncTimestamp: 0`
   - Create actions: 
     - Shape actions: `setShapes`, `updateShape`, `addShape`, `removeShape`
     - Selection: `setSelectedIds`
     - Viewport: `setViewport`
     - Auth: `setCurrentUser`
     - Sync: `addPendingWrite(shapeId, timestamp)`, `removePendingWrite(shapeId)`
     - Connection: `setConnectionState`, `setLastSyncTimestamp`
     - Users: `setUsers`

2. **Build Google OAuth login**
   - **Create:** `src/components/Auth/LoginButton.jsx`
   - Implement `signInWithPopup` with GoogleAuthProvider
   - Add loading and error states
   - Style button with Tailwind

3. **Create auth state hook**
   - **Create:** `src/hooks/useAuth.js`
   - Listen to `onAuthStateChanged`
   - Extract display name from email (use email prefix)
   - Update Zustand store with current user

4. **Build auth guard**
   - **Create:** `src/components/Auth/AuthGuard.jsx`
   - Show login screen if not authenticated
   - Show main app if authenticated
   - Add sign-out button

5. **Update App.jsx**
   - **Edit:** `src/App.jsx`
   - Wrap app with AuthGuard
   - Call useAuth hook

**Files Created:**
- `src/store/canvasStore.js`
- `src/components/Auth/LoginButton.jsx`
- `src/hooks/useAuth.js`
- `src/components/Auth/AuthGuard.jsx`

**Files Edited:**
- `src/App.jsx`

**Acceptance:** Can sign in with Google, user state persists on refresh, sign out works, Zustand store has three-tier structure ready for sync

---

## PR #3: Basic Canvas with Pan & Zoom
**User Stories:** Designer story 8  
**Goal:** Render canvas with smooth pan and zoom

### Tasks:
1. **Create canvas component**
   - **Create:** `src/components/Canvas/Canvas.jsx`
   - Set up Konva Stage and Layer
   - Set stage size to window dimensions
   - Add background color/grid

2. **Implement pan functionality**
   - **Edit:** `src/components/Canvas/Canvas.jsx`
   - Make Stage draggable
   - Add `onDragEnd` handler
   - Update viewport x/y in Zustand
   - Change cursor style (grab/grabbing)

3. **Implement zoom functionality**
   - **Edit:** `src/components/Canvas/Canvas.jsx`
   - Add `onWheel` handler
   - Calculate zoom toward mouse cursor
   - Clamp zoom between 0.1 and 3
   - Update viewport zoom in Zustand

4. **Connect to App**
   - **Edit:** `src/App.jsx`
   - Render Canvas component in authenticated view

**Files Created:**
- `src/components/Canvas/Canvas.jsx`

**Files Edited:**
- `src/App.jsx`

**Acceptance:** Canvas fills viewport, pan is smooth, zoom toward cursor works, 60 FPS maintained

---

## PR #4: Shape Creation & Local Manipulation
**User Stories:** Designer stories 9-10  
**Goal:** Create rectangles and drag them locally (no sync yet - that's PR #5)

### Tasks:
1. **Create shape component**
   - **Create:** `src/components/Canvas/Shape.jsx`
   - Render Konva Rect for rectangle type
   - Accept props: shape object with id, x, y, width, height, fill
   - Add basic click handler (no selection logic yet)

2. **Add shape creation mode**
   - **Edit:** `src/store/canvasStore.js`
   - Add `createMode` state (null or 'rectangle')
   - Add `setCreateMode` action

3. **Create toolbar**
   - **Create:** `src/components/UI/Toolbar.jsx`
   - Add "Create Rectangle" button
   - Toggle createMode in Zustand

4. **Implement click-to-place (local only)**
   - **Edit:** `src/components/Canvas/Canvas.jsx`
   - Add Stage onClick handler
   - Convert screen coords to world coords (account for pan/zoom)
   - Generate shape with unique ID (crypto.randomUUID())
   - Add shape to Zustand with metadata:
     - `createdBy: currentUser.uid`
     - `clientTimestamp: Date.now()` (for local comparison)
     - `updatedAt: null` (will be set by server on sync)
     - `updatedBy: currentUser.uid`
   - **Important:** Only update local Zustand, NO Firestore yet

5. **Add shape selection**
   - **Edit:** `src/components/Canvas/Shape.jsx`
   - Add onClick handler to update selectedIds in Zustand
   - Show blue stroke on selected shapes (strokeWidth scaled by zoom)
   - Click background to deselect (clear selectedIds)

6. **Add shape dragging (local only)**
   - **Edit:** `src/components/Canvas/Shape.jsx`
   - Make selected shapes draggable
   - Add onDragMove handler - update Zustand immediately
   - Add onDragEnd handler - update Zustand with final position
   - Update clientTimestamp on drag end
   - **Important:** Only update local Zustand, NO Firestore yet

7. **Render shapes from store**
   - **Edit:** `src/components/Canvas/Canvas.jsx`
   - Map over shapes from Zustand
   - Render Shape component for each shape
   - Ensure shapes layer is below cursors layer (z-order)

**Files Created:**
- `src/components/Canvas/Shape.jsx`
- `src/components/UI/Toolbar.jsx`

**Files Edited:**
- `src/store/canvasStore.js`
- `src/components/Canvas/Canvas.jsx`

**Acceptance:** 
- Can create rectangles by clicking
- Can drag them smoothly
- Selection works
- 60 FPS during drag
- Everything is LOCAL ONLY (no Firestore yet)
- Shapes have proper metadata structure for later sync

---

## PR #5: Firestore Sync Infrastructure
**User Stories:** Designer stories 11-14  
**Goal:** Set up real-time shape synchronization between users with bulletproof architecture

### Tasks:
1. **Define Firestore structure**
   - **Create:** `src/services/firestore.js`
   - Define collection helpers: `getShapesRef(canvasId)`, `getUsersRef(canvasId)`
   - Document collection structure in comments
   - Use hardcoded canvasId: "default-canvas" for MVP

2. **Create Sync Engine (Write Path Only)**
   - **Create:** `src/services/syncEngine.js`
   - Implement SyncEngine class with:
     - `applyLocalChange(shapeId, updates)` - updates Zustand immediately
     - `queueWrite(shapeId, shape)` - adds to write queue
     - `flushWrites()` - batch writes to Firestore
   - Add debounced flush (100ms) and immediate flush methods
   - Track pending writes in Zustand
   - CRITICAL: No listeners in this file, only writes

3. **Add pending writes to Zustand**
   - **Edit:** `src/store/canvasStore.js`
   - Add `pendingWrites: {}` to state
   - Add actions: `addPendingWrite(shapeId, timestamp)`, `removePendingWrite(shapeId)`
   - Add `connectionState` and `lastSyncTimestamp` to state

4. **Create Firestore listener hook (Read Path Only)**
   - **Create:** `src/hooks/useFirestoreSync.js`
   - Listen to shapes collection with onSnapshot
   - CRITICAL Echo Prevention:
     - Check `change.doc.metadata.hasPendingWrites` - skip if true
     - Check `pendingWrites` map in Zustand - skip if shape has pending write
   - CRITICAL Timestamp Comparison:
     - Only update if `remote.updatedAt > local.updatedAt`
   - Handle docChanges (added, modified, removed)
   - Update Zustand store with remote changes only
   - NEVER update Zustand inside write callback

5. **Update shape timestamps**
   - **Edit:** `src/store/canvasStore.js`
   - Add serverTimestamp import from firebase/firestore
   - When creating/updating shapes, set:
     - `updatedAt: serverTimestamp()` (for Firestore)
     - `clientTimestamp: Date.now()` (for local comparison)
     - `updatedBy: currentUser.uid`

6. **Integrate sync with canvas**
   - **Edit:** `src/components/Canvas/Canvas.jsx`
   - Import and instantiate SyncEngine
   - Call useFirestoreSync hook (read path)
   - On shape create: call `syncEngine.applyLocalChange()` then `syncEngine.queueWrite()`
   - On drag move: call `syncEngine.applyLocalChange()` with debounced queue
   - On drag end: call `syncEngine.applyLocalChange()` with immediate flush
   - Keep write path and read path completely separate

7. **Add loading state**
   - **Edit:** `src/components/Canvas/Canvas.jsx`
   - Show loading indicator while initial shapes load
   - Track `isLoading` in Zustand

8. **Create SYNC_RULES.md**
   - **Create:** `SYNC_RULES.md` in project root
   - Document critical sync rules:
     - Write path is one way (never loops back)
     - Always check hasPendingWrites
     - Always check pendingWrites map
     - Separate write and read paths
     - Use server timestamp as authority
   - Reference this file when working with Cursor AI

**Files Created:**
- `src/services/firestore.js`
- `src/services/syncEngine.js`
- `src/hooks/useFirestoreSync.js`
- `SYNC_RULES.md`

**Files Edited:**
- `src/store/canvasStore.js`
- `src/components/Canvas/Canvas.jsx`

**Acceptance:** 
- Shapes sync between 2+ browsers in <100ms
- Refresh preserves state
- No duplicate shapes (echoes prevented)
- No infinite loops
- Rapid edits don't corrupt state
- Clear separation between write path and read path

---

## PR #6: Multiplayer Cursors (Separate Fast Path)
**User Stories:** Designer story 11  
**Goal:** Show real-time cursor positions with names, completely separate from shape sync

### Tasks:
1. **Add cursor tracking**
   - **Edit:** `src/components/Canvas/Canvas.jsx`
   - Add onMouseMove handler to Stage
   - Convert to world coordinates (account for pan/zoom)
   - Throttle to 50ms (20Hz) with throttle utility

2. **Create cursor sync hook (Separate from shape sync)**
   - **Create:** `src/hooks/useCursorSync.js`
   - Write cursor position to Firestore users/{userId} document
   - Include: uid, displayName, cursorX, cursorY, color, online, lastSeen
   - Generate random user color (store in Zustand)
   - Non-blocking writes (use updateDoc without await)
   - Catch and silently log cursor write errors (non-critical)
   - CRITICAL: Completely separate from shape sync logic

3. **Listen to user cursors (Separate listener)**
   - **Edit:** `src/hooks/useCursorSync.js`
   - Create separate onSnapshot listener for users collection
   - Update Zustand users state
   - Filter out current user (don't show own cursor)
   - Filter out offline users (online: false)

4. **Create cursor component**
   - **Create:** `src/components/Canvas/Cursor.jsx`
   - Render Konva Circle for cursor position
   - Render Konva Text for user name label
   - Accept user prop with x, y, displayName, color
   - Position label offset from cursor

5. **Render cursors on separate layer**
   - **Edit:** `src/components/Canvas/Canvas.jsx`
   - Create separate Konva Layer for cursors (above shapes layer)
   - Map over users from Zustand
   - Render Cursor component for each user except current
   - Ensure cursor layer doesn't interfere with shape interactions

**Files Created:**
- `src/hooks/useCursorSync.js`
- `src/components/Canvas/Cursor.jsx`

**Files Edited:**
- `src/components/Canvas/Canvas.jsx`
- `src/store/canvasStore.js`

**Acceptance:** 
- See other users' cursors with names
- <50ms latency
- Smooth movement
- Cursor updates don't affect shape sync
- Failures in cursor sync don't crash app

---

## PR #7: Presence System & Connection State
**User Stories:** Designer story 12  
**Goal:** Show who's online, handle disconnects, monitor connection state

### Tasks:
1. **Create presence hook (Separate from shape/cursor sync)**
   - **Create:** `src/hooks/usePresence.js`
   - Write user document on auth with online: true
   - Set up onDisconnect() to mark online: false
   - Implement 30-second heartbeat (setInterval)
   - Generate and store user color deterministically from uid
   - Clean up heartbeat on unmount

2. **Create connection state hook**
   - **Create:** `src/hooks/useConnectionState.js`
   - Monitor Firestore connection state
   - Update Zustand connectionState ('connected' | 'disconnected' | 'reconnecting')
   - On reconnect, verify state integrity:
     - Fetch all shapes from Firestore
     - Compare with local state
     - Add missing shapes, remove deleted shapes, update stale shapes
   - Clear pending writes if stale (older than 60s)

3. **Create online users component**
   - **Create:** `src/components/UI/OnlineUsers.jsx`
   - Display list of online users
   - Show user count
   - Show each user's name and color indicator
   - Filter users where online: true

4. **Add connection status indicator**
   - **Create:** `src/components/UI/ConnectionStatus.jsx`
   - Show connection state (connected/disconnected/reconnecting)
   - Display as colored dot or banner
   - Show last sync timestamp when disconnected

5. **Integrate presence and connection state**
   - **Edit:** `src/App.jsx`
   - Call usePresence hook after auth
   - Call useConnectionState hook
   - Render OnlineUsers component
   - Render ConnectionStatus component

**Files Created:**
- `src/hooks/usePresence.js`
- `src/hooks/useConnectionState.js`
- `src/components/UI/OnlineUsers.jsx`
- `src/components/UI/ConnectionStatus.jsx`

**Files Edited:**
- `src/App.jsx`
- `src/store/canvasStore.js`

**Acceptance:** 
- Online users list updates in real-time
- Disconnects handled gracefully
- User marked offline on leave
- Reconnection restores correct state
- Connection status visible to user
- No data loss during disconnect/reconnect

---

## PR #8: MVP Testing & Polish
**User Stories:** Designer stories 15-16  
**Goal:** Test all MVP requirements and fix bugs

### Tasks:
1. **Sync architecture testing**
   - Test with 2 browsers: both create shapes simultaneously
   - Test with 2 browsers: both drag same shape (verify conflict resolution)
   - Test rapid edits (click create 10 times fast) - verify no duplicates
   - Test echo prevention: verify local edits don't trigger listener updates
   - Test pending writes: verify writes clear after Firestore confirms
   - Monitor console for infinite loops or excessive re-renders

2. **Performance testing**
   - Test with Chrome DevTools Performance tab
   - Verify 60 FPS during pan, zoom, drag
   - Test with 50+ shapes
   - Measure sync latency with console timestamps
   - Test on throttled network (Fast 3G)
   - Monitor Firestore read/write usage in Firebase console

3. **Multi-user testing**
   - Open 2 browsers side-by-side
   - Test simultaneous shape creation
   - Test simultaneous dragging of different shapes
   - Test dragging same shape (verify last-write-wins)
   - Test refresh/reconnect scenarios
   - Test all users disconnect then reconnect

4. **Connection state testing**
   - Disconnect network, verify UI shows disconnected
   - Reconnect, verify state reconciliation works
   - Test creating shapes while offline, verify they sync on reconnect
   - Test pending writes during disconnect

5. **Bug fixes**
   - Fix any issues found in testing
   - Handle edge cases (rapid clicks, network issues)
   - Improve error messages
   - Verify no ghost objects or duplicates
   - Verify no infinite loops

6. **Documentation**
   - **Edit:** `README.md`
   - Add setup instructions
   - Document sync architecture decisions
   - Document SYNC_RULES.md and why it exists
   - Add screenshots/demo GIF
   - List MVP features completed
   - Document known limitations

7. **Deploy MVP version**
   - Build and deploy updated version
   - Test deployed version thoroughly with 2+ devices
   - Update README with live URL

**Files Edited:**
- `README.md`
- Various bug fixes across components

**Acceptance:** 
- All MVP requirements met
- Deployed and tested with multiple users
- Performs well (60 FPS, <100ms sync, <50ms cursors)
- No duplicates, no ghost objects, no infinite loops
- Clean separation of write and read paths verified
- Connection state handling works
- State persists through disconnects

---

## PR #9: Post-MVP Planning
**User Stories:** N/A  
**Goal:** Plan remaining features based on MVP learnings

### Tasks:
1. **Review MVP performance**
   - Analyze what worked well
   - Identify bottlenecks or issues
   - Gather any user feedback

2. **Create detailed task list for Post-MVP features**
   - Break down remaining canvas features (circles, lines, text, resize, rotate, multi-select, delete, duplicate, layers)
   - Break down AI agent features (Claude integration, tool schema, chat UI, command processing, complex operations)
   - Estimate time for each feature
   - Prioritize based on difficulty and dependencies

3. **Update architecture diagram**
   - Document any changes from MVP implementation
   - Plan architecture for AI integration
   - Plan state management for complex features

4. **Create task breakdown similar to MVP PRs**
   - Group Post-MVP features into logical PRs
   - Group AI features into logical PRs
   - Define acceptance criteria for each

**Deliverable:** Detailed task list for Days 2-7 based on actual MVP implementation experience

---

## Notes

### Testing Strategy (Per PR)
- Test locally with 2 browser windows after each PR
- Deploy after each PR to catch deployment issues early
- Run performance checks (FPS, sync latency) frequently

### Canvas ID Management
For MVP, hardcode canvasId as `"default-canvas"` so all users connect to same canvas. Post-MVP can add URL-based canvas routing for multiple canvases.

### Conflict Resolution
Using simple "last write wins" based on `updatedAt` timestamp. Document this choice for potential future improvement.

### Firestore Security Rules
Start with test mode (open rules) for MVP. Add proper security rules in Post-MVP phase to restrict read/write access to authenticated users only.

### Key Dependencies
- PR #2 must complete before any canvas work (need auth + store)
- PR #5 must complete before PR #6 (cursors need Firestore structure)
- **PR #5 is critical** - sync architecture must be correct or everything breaks
- PR #8 gates progression to Post-MVP work

### Sync Architecture Files (Core of Project)
These files contain the critical sync logic and must follow strict rules:
- `src/services/syncEngine.js` - Write path only, no listeners
- `src/hooks/useFirestoreSync.js` - Read path only, listener logic
- `src/hooks/useCursorSync.js` - Separate cursor sync, isolated from shapes
- `src/hooks/usePresence.js` - Separate presence logic
- `src/hooks/useConnectionState.js` - Connection monitoring and reconciliation
- `SYNC_RULES.md` - Critical rules document, reference when implementing sync

**When implementing sync logic:**
1. Reference SYNC_RULES.md constantly
2. Keep write path and read path in separate files
3. Never mix shape sync, cursor sync, and presence logic
4. Test with 2 browsers after every change
5. Monitor for infinite loops (watch console, CPU usage)

### Common Bugs to Watch For
- ❌ Updating local state inside Firestore write callback
- ❌ Not checking hasPendingWrites in listener
- ❌ Not tracking pendingWrites in Zustand
- ❌ Mixing write and read paths in same function
- ❌ Cursor sync interfering with shape sync
- ❌ Ghost objects from race conditions
- ❌ Infinite loops from echo updates
