# CollabCanvas - Task List by PR

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
1. **Create Zustand store structure**
   - **Create:** `src/store/canvasStore.js`
   - Define state: `shapes`, `selectedIds`, `viewport`, `users`, `currentUser`
   - Create actions: `setShapes`, `updateShape`, `addShape`, `removeShape`, `setViewport`, `setCurrentUser`, `setSelectedIds`

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

**Acceptance:** Can sign in with Google, user state persists on refresh, sign out works

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
**Goal:** Create rectangles and drag them locally (no sync yet)

### Tasks:
1. **Create shape component**
   - **Create:** `src/components/Canvas/Shape.jsx`
   - Render Konva Rect for rectangle type
   - Accept props: shape object with id, x, y, width, height, fill
   - Add basic click handler

2. **Add shape creation mode**
   - **Edit:** `src/store/canvasStore.js`
   - Add `createMode` state
   - Add `setCreateMode` action

3. **Create toolbar**
   - **Create:** `src/components/UI/Toolbar.jsx`
   - Add "Create Rectangle" button
   - Toggle createMode in Zustand

4. **Implement click-to-place**
   - **Edit:** `src/components/Canvas/Canvas.jsx`
   - Add Stage onClick handler
   - Convert screen coords to world coords (account for pan/zoom)
   - Generate shape with unique ID (crypto.randomUUID())
   - Add shape to Zustand with metadata (createdBy, createdAt, updatedAt)

5. **Add shape selection**
   - **Edit:** `src/components/Canvas/Shape.jsx`
   - Add onClick handler to update selectedIds
   - Show blue stroke on selected shapes
   - Click background to deselect

6. **Add shape dragging**
   - **Edit:** `src/components/Canvas/Shape.jsx`
   - Make selected shapes draggable
   - Add onDragMove and onDragEnd handlers
   - Update shape position in Zustand during drag
   - Add updatedAt timestamp on drag end

7. **Render shapes from store**
   - **Edit:** `src/components/Canvas/Canvas.jsx`
   - Map over shapes from Zustand
   - Render Shape component for each

**Files Created:**
- `src/components/Canvas/Shape.jsx`
- `src/components/UI/Toolbar.jsx`

**Files Edited:**
- `src/store/canvasStore.js`
- `src/components/Canvas/Canvas.jsx`

**Acceptance:** Can create rectangles by clicking, can drag them, selection works, 60 FPS during drag

---

## PR #5: Firestore Sync Infrastructure
**User Stories:** Designer stories 11-14  
**Goal:** Set up real-time shape synchronization between users

### Tasks:
1. **Define Firestore structure**
   - **Create:** `src/services/firestore.js`
   - Define collection helpers: `getShapesRef(canvasId)`, `getUsersRef(canvasId)`
   - Document collection structure in comments
   - Use hardcoded canvasId: "default-canvas" for MVP

2. **Create shape sync hook**
   - **Create:** `src/hooks/useSyncShapes.js`
   - Implement write to Firestore on shape create/update
   - Add debounced write function (100ms) for drag events
   - Handle write errors

3. **Add Firestore listener for shapes**
   - **Edit:** `src/hooks/useSyncShapes.js`
   - Create onSnapshot listener for shapes collection
   - Handle docChanges (added, modified, removed)
   - Filter out local echoes (check hasPendingWrites)
   - Implement timestamp-based conflict resolution
   - Update Zustand store with remote changes

4. **Integrate sync with canvas**
   - **Edit:** `src/components/Canvas/Canvas.jsx`
   - Call useSyncShapes hook
   - Connect shape creation to syncShape
   - Connect drag end to debouncedSync

5. **Add loading state**
   - **Edit:** `src/components/Canvas/Canvas.jsx`
   - Show loading indicator while initial shapes load
   - Track loading state in Zustand

**Files Created:**
- `src/services/firestore.js`
- `src/hooks/useSyncShapes.js`

**Files Edited:**
- `src/components/Canvas/Canvas.jsx`
- `src/store/canvasStore.js`

**Acceptance:** Shapes sync between 2+ browsers in <100ms, refresh preserves state, no duplicate shapes

---

## PR #6: Multiplayer Cursors
**User Stories:** Designer story 11  
**Goal:** Show real-time cursor positions with names

### Tasks:
1. **Add cursor tracking**
   - **Edit:** `src/components/Canvas/Canvas.jsx`
   - Add onMouseMove handler to Stage
   - Convert to world coordinates
   - Throttle to 50ms (20Hz)

2. **Create cursor sync function**
   - **Create:** `src/hooks/useCursorSync.js`
   - Write cursor position to Firestore user document
   - Include: uid, displayName, x, y, color, online, lastSeen
   - Generate random user color

3. **Listen to user cursors**
   - **Edit:** `src/hooks/useCursorSync.js`
   - Create onSnapshot listener for users collection
   - Update Zustand users state
   - Filter out offline users

4. **Create cursor component**
   - **Create:** `src/components/Canvas/Cursor.jsx`
   - Render Konva Circle for cursor position
   - Render Konva Text for user name label
   - Accept user prop with x, y, displayName, color

5. **Render cursors layer**
   - **Edit:** `src/components/Canvas/Canvas.jsx`
   - Create separate Layer for cursors
   - Map over users, render Cursor for each (except current user)

**Files Created:**
- `src/hooks/useCursorSync.js`
- `src/components/Canvas/Cursor.jsx`

**Files Edited:**
- `src/components/Canvas/Canvas.jsx`
- `src/store/canvasStore.js`

**Acceptance:** See other users' cursors with names, <50ms latency, smooth movement

---

## PR #7: Presence System
**User Stories:** Designer story 12  
**Goal:** Show who's online and handle disconnects

### Tasks:
1. **Create presence hook**
   - **Create:** `src/hooks/usePresence.js`
   - Write user document on auth with online: true
   - Set up onDisconnect() to mark offline
   - Implement 30-second heartbeat
   - Generate and store user color

2. **Create online users component**
   - **Create:** `src/components/UI/OnlineUsers.jsx`
   - Display list of online users
   - Show user count
   - Show each user's name and color indicator

3. **Integrate presence**
   - **Edit:** `src/App.jsx`
   - Call usePresence hook after auth
   - Render OnlineUsers component

**Files Created:**
- `src/hooks/usePresence.js`
- `src/components/UI/OnlineUsers.jsx`

**Files Edited:**
- `src/App.jsx`

**Acceptance:** Online users list updates in real-time, disconnects handled gracefully, user marked offline on leave

---

## PR #8: MVP Testing & Polish
**User Stories:** Designer stories 15-16  
**Goal:** Test all MVP requirements and fix bugs

### Tasks:
1. **Performance testing**
   - Test with Chrome DevTools Performance tab
   - Verify 60 FPS during pan, zoom, drag
   - Test with 50+ shapes
   - Measure sync latency with console timestamps
   - Test on throttled network (Fast 3G)

2. **Multi-user testing**
   - Open 2 browsers side-by-side
   - Test simultaneous shape creation
   - Test simultaneous dragging
   - Test refresh/reconnect scenarios
   - Test all users disconnect then reconnect

3. **Bug fixes**
   - Fix any issues found in testing
   - Handle edge cases (rapid clicks, network issues)
   - Improve error messages

4. **Documentation**
   - **Edit:** `README.md`
   - Add setup instructions
   - Document architecture decisions
   - Add screenshots/demo GIF
   - List MVP features completed

5. **Deploy MVP version**
   - Build and deploy updated version
   - Test deployed version thoroughly
   - Update README with live URL

**Files Edited:**
- `README.md`
- Various bug fixes across components

**Acceptance:** All MVP requirements met, deployed, tested with multiple users, performs well

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
- PR #8 gates progression to Post-MVP work