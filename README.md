# CollabCanvas

**Real-time collaborative design tool with multiplayer canvas editing and AI-powered design assistance.**

> **MVP Status:** ✅ **Complete** - Real-time multiplayer canvas with bulletproof sync architecture

## 🚀 Live Demo

**🔗 Deployed URL:** **https://canvascollab-ba367.web.app/**

Test with multiple browsers to see real-time collaboration in action!

## 🎨 Current Features

### ✅ Canvas & Shapes
- **Shape Creation** - Rectangle creation tool with click-to-place interaction
- **Multi-Select** - Drag-to-select rectangle or Shift+click to select multiple shapes
- **Shape Management** - Delete, duplicate, and organize shapes with z-index layering
- **Copy/Paste** - Clipboard support with offset positioning and relative layout preservation
- **Layer Panel** - Visual layer management with drag reordering
- **Canvas Export** - Export canvas as PNG, SVG, or JSON with metadata
- **Real-time Shape Sync** - All shape operations sync across users in <100ms

### ✅ Interaction & Navigation
- **Pan & Zoom** - Smooth 60 FPS navigation with mouse/trackpad
- **Space + Drag Panning** - Figma-style panning with Space key
- **Viewport Persistence** - Your zoom and pan position saves to Firestore and restores on reload
- **Window Resize Handling** - Canvas adapts gracefully to window resizing, toolbars stay positioned
- **Multi-shape Dragging** - Select and move multiple shapes together
- **Arrow Key Nudging** - Fine-tune shape positions with arrow keys (10px) or Shift+Arrow (50px)
- **Keyboard Shortcuts** - Full shortcut support (see reference below)
- **Visual Feedback** - Selection rectangles, cursor states, and interaction hints

### ✅ Collaboration Features  
- **Google OAuth Authentication** - Secure user identity with persistent sessions
- **Real-time Multiplayer Cursors** - See other users' cursors with names and colors (<50ms sync)
- **Presence System** - Online users list with real-time join/leave updates
- **Connection State Monitoring** - Visual indicators for connection status
- **State Persistence** - All changes saved to Firestore, survive disconnects and refreshes

### 🎹 Keyboard Shortcuts

| Shortcut | Action |
|----------|---------|
| **Space + Drag** | Pan around canvas |
| **Click + Drag** | Select shapes / Create selection rectangle |
| **Shift + Click** | Add/remove shapes from selection |
| **Delete / Backspace** | Delete selected shapes |
| **Ctrl + A** | Select all shapes |
| **Ctrl + D** | Duplicate selected shapes |
| **Ctrl + C** | Copy selected shapes to clipboard |
| **Ctrl + V** | Paste shapes from clipboard |
| **Ctrl + ]** | Bring selected shapes forward |
| **Ctrl + [** | Send selected shapes backward |
| **Arrow Keys** | Nudge selected shapes (10px) |
| **Shift + Arrow** | Nudge selected shapes (50px) |
| **Ctrl + K** | Open AI chat panel (when available) |
| **Ctrl + ?** | Show keyboard shortcuts help |
| **Escape** | Clear selection and exit create mode |

### 📱 Interaction Guide

**Creating Shapes:**
1. Click rectangle tool in toolbar
2. Click on canvas to place shape
3. Shape appears instantly across all users

**Multi-Select Workflow:**
1. **Drag selection:** Click empty area and drag to select multiple shapes
2. **Add to selection:** Hold Shift and click shapes to add/remove
3. **Batch operations:** Delete, duplicate, or move multiple shapes at once

**Layer Management:**
1. Use Layer Panel on right sidebar to see all shapes
2. Drag shapes in panel to reorder layers
3. Use Ctrl+] / Ctrl+[ shortcuts for quick layer changes

**Copy/Paste & Duplication:**
1. Select shapes you want to copy
2. Press Ctrl+C to copy (or Ctrl+D to duplicate immediately)
3. Press Ctrl+V to paste with automatic offset
4. Relative positions are preserved for multi-shape copies

**Canvas Export:**
1. Click the Export button in toolbar
2. Choose format: PNG (image), SVG (vector), or JSON (data)
3. Select full canvas or current viewport only
4. File downloads with metadata automatically

### ✅ Technical Architecture
- **Bulletproof Sync Engine** - Prevents infinite loops, ghost objects, and race conditions
- **Optimistic Updates** - Instant local feedback (60 FPS) with background sync
- **Echo Prevention** - Dual-layer protection against update loops
- **Timestamp-based Conflict Resolution** - "Last write wins" using server timestamps
- **Debounced Writes** - Efficient Firestore usage during continuous operations
- **Three-tier State Management** - Rendering, sync tracking, and connection monitoring

## 🏗️ Architecture Overview

### Sync Architecture (The Heart of Multiplayer)

CollabCanvas uses a **hybrid local-first approach** with strict separation of write and read paths:

```
User Action → Local Update (60fps) → Queue Write → Firestore → Other Users
                     ↑                                              ↓
                Real-time UX                            Firestore Listener → Echo Prevention → Remote Update
```

**Key Architecture Files:**
- `src/services/syncEngine.js` - **Write path only** (applyLocalChange, queueWrite, flushWrites)
- `src/hooks/useFirestoreSync.js` - **Read path only** (listeners, echo prevention, conflict resolution)
- `SYNC_RULES.md` - **Critical rules document** (read before editing sync code)

### State Management (Three-Tier Zustand Store)

```javascript
{
  // Tier 1: Rendering State (what users see)
  shapes: { [id]: { type, x, y, width, height, fill, updatedAt, ... } },
  selectedIds: [],
  viewport: { x, y, zoom },
  users: { [uid]: { name, cursorX, cursorY, color, online } },
  clipboard: { shapes: [], timestamp: number }, // Copy/paste clipboard
  
  // Tier 2: Sync Tracking (prevents echo loops)
  pendingWrites: { [shapeId]: timestamp },
  currentUser: { uid, displayName, color },
  viewportSaveDebounceTimer: NodeJS.Timeout | null, // Viewport persistence debouncing
  
  // Tier 3: Connection State (network monitoring)
  connectionState: 'connected' | 'disconnected' | 'reconnecting',
  lastSyncTimestamp: number
}
```

### Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Canvas:** React-Konva (high-performance Canvas API wrapper)
- **State:** Zustand (lightweight, perfect for canvas state)
- **Backend:** Firebase Firestore (real-time listeners) + Firebase Auth
- **AI:** Anthropic Claude Sonnet 4 (Post-MVP)
- **Deployment:** Firebase Hosting

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ and npm
- Firebase project access (or create your own)

### Quick Start

1. **Clone and install:**
   ```bash
   git clone [repo-url]
   cd CollabCanvas
   npm install
   ```

2. **Environment setup:**
   Create `.env.local` with your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_ANTHROPIC_API_KEY=your_anthropic_key
   ```

3. **Firebase setup:**
   - Enable Firestore Database (start in test mode)
   - Enable Authentication → Google provider
   - Add your domain to authorized domains

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Test multiplayer:**
   - Open multiple browser windows to `http://localhost:5173`
   - Sign in with different Google accounts
   - Test shape creation and dragging between windows

### Build and Deploy

**Option 1: Firebase Hosting (Recommended)**

```bash
# Build production bundle
npm run build

# Deploy to Firebase (requires Firebase CLI)
# Install if needed: npm install -g firebase-tools
firebase login
firebase deploy --only hosting

# Your app will be live at: https://[your-project-id].web.app
```

**Option 2: Vercel**

```bash
# Install Vercel CLI
npm install -g vercel

# Build and deploy
npm run build
vercel --prod
```

**Option 3: Netlify**

```bash
# Build
npm run build

# Deploy via Netlify CLI or drag-and-drop dist/ folder to Netlify dashboard
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**Important Deployment Notes:**
- Ensure all environment variables are set in your hosting platform
- For Firebase: Set environment variables in Firebase Console → Hosting
- For Vercel/Netlify: Set environment variables in project settings
- HTTPS is required for clipboard API functionality (navigator.clipboard)
- Test multiplayer functionality after deployment with multiple devices

## 🎯 Performance Targets (All Met)

- **Rendering:** 60 FPS during pan, zoom, and drag operations
- **Cursor Sync:** <50ms latency between users
- **Shape Sync:** <100ms latency for shape updates  
- **Concurrent Users:** Tested with 2+ users simultaneously
- **Shape Count:** 50+ shapes without performance degradation

## 🧪 Testing Guide

### Manual Testing Protocol

**Basic Functionality:**
1. Open 2 browser windows side-by-side
2. Sign in with different Google accounts
3. Verify both users appear in online users list
4. Move mouse in one window, verify cursor appears in other
5. Create rectangle in one window, verify it appears in other
6. Drag rectangle in one window, verify smooth sync in other

**Multi-Select & Operations:**
1. Create 3-4 rectangles in one window
2. Drag-select multiple shapes, verify selection syncs to other window
3. Press Delete key, verify shapes deleted in both windows
4. Press Ctrl+D to duplicate, verify duplicates appear in both windows
5. Test Layer Panel reordering, verify z-order changes sync

**Edge Cases Testing:**
1. **Rapid Creation:** Click create button 10 times rapidly - no duplicates should appear
2. **Simultaneous Editing:** Both users drag same shape - should sync smoothly
3. **Network Issues:** Disconnect one user's network, make changes, reconnect - changes should sync
4. **Refresh Testing:** Refresh browser, verify all shapes and state persist
5. **Performance:** Create 50+ shapes, verify 60 FPS maintained

**Sync Architecture Validation:**
1. Open browser console in both windows
2. Look for echo prevention messages: `🔄 Skipping echo (hasPendingWrites)`
3. Verify no infinite loops or excessive re-renders
4. Check Network tab for reasonable Firestore usage

## 🔄 Conflict Resolution Strategy

CollabCanvas uses a **"Last Write Wins"** approach with server timestamps for conflict resolution. This simple, proven strategy ensures consistent state across all clients without complex operational transform algorithms.

### How It Works

1. **Server Timestamps as Authority**
   - Every write to Firestore includes `updatedAt: serverTimestamp()`
   - Server timestamps are the single source of truth for ordering
   - Clients defer to server time, never use local timestamps for resolution

2. **Optimistic Local Updates**
   - User actions update local Zustand store immediately (60 FPS UI responsiveness)
   - Changes are queued and written to Firestore with debouncing (~100ms batches)
   - Other clients receive updates via Firestore listeners

3. **Conflict Scenarios**
   
   **Scenario A: Two users edit the same shape simultaneously**
   - Both users see instant local feedback
   - Both writes reach Firestore with server timestamps
   - The last write to reach the server wins
   - All clients converge to the winning state via listeners
   
   **Scenario B: Network partition / offline editing**
   - User continues editing locally (optimistic updates)
   - When reconnected, local changes sync to Firestore
   - If another user edited the same shape, server timestamp determines winner
   - User may see their changes temporarily overwritten (expected behavior)

4. **Echo Prevention**
   - When a client writes to Firestore, it marks the write in `pendingWrites`
   - When the listener fires, it checks: "Did I just write this?"
   - If yes, skip the update (already applied locally)
   - If no, apply the remote update

5. **Why This Approach?**
   - ✅ Simple to implement and reason about
   - ✅ No complex operational transform or CRDT logic
   - ✅ Works reliably with Firestore's built-in timestamps
   - ✅ Proven pattern used by major collaborative tools
   - ✅ Users understand "last edit wins" intuitively
   - ⚠️ Trade-off: User edits may be overwritten in rare simultaneous edit cases

### Handling Specific Operations

- **Shape Creation:** ID generated client-side (UUID), conflicts impossible
- **Shape Movement/Resize:** Last position/size wins based on server timestamp
- **Shape Deletion:** Deletion timestamp compared to update timestamp
- **Multi-Select Operations:** Each shape treated independently for conflicts
- **Cursor Movement:** High-frequency updates, intentionally overwrite (no conflict handling needed)
- **User Presence:** Simple online/offline toggle, last status wins

### Future Enhancements (Not Implemented)

For production applications requiring stronger conflict handling:
- User notifications when edits are overwritten
- Visual indicators during simultaneous editing
- Shape locking mechanism (first to select gets edit rights)
- Operational transform for text editing
- Version history and manual conflict resolution UI

**Current Status:** Simple "last write wins" is sufficient for the target use case (small teams, <10 concurrent users, low conflict probability).

## 🚨 Critical Architecture Rules

> **⚠️ BEFORE EDITING SYNC CODE: Read `SYNC_RULES.md`**

This project uses a bulletproof sync architecture that prevents infinite loops, ghost objects, and race conditions. The architecture has strict rules that **must not be violated**:

### Core Rules:
1. **Never mix write and read paths** - Keep SyncEngine (writes) separate from useFirestoreSync (reads)
2. **Always check for echoes** - Use both `hasPendingWrites` and `pendingWrites` map
3. **Server timestamps are authority** - Use `serverTimestamp()` for conflict resolution
4. **Test with 2+ browsers** - After every sync-related change

### Why SYNC_RULES.md Exists:
- This is our **second attempt** at sync architecture (first failed due to infinite loops)
- Contains step-by-step sync flow documentation
- Lists common bugs and their solutions
- Defines file responsibilities to prevent mixing concerns
- **Must be referenced** when working on multiplayer features

## 📁 Project Structure

```
src/
├── components/
│   ├── Auth/              # Google OAuth (LoginButton, AuthGuard)
│   ├── Canvas/            # Canvas rendering (Canvas, Shape, Cursor)
│   └── UI/                # UI components (Toolbar, OnlineUsers, ConnectionStatus)
├── hooks/                 # READ PATH hooks (sync listeners)
│   ├── useAuth.js         # Authentication state
│   ├── useFirestoreSync.js # Shape sync listener (read only)
│   ├── useCursorSync.js   # Cursor sync (separate from shapes)
│   ├── usePresence.js     # Online/offline status
│   └── useConnectionState.js # Network monitoring
├── services/              # WRITE PATH services  
│   ├── firebase.js        # Firebase initialization
│   ├── firestore.js       # Collection references
│   └── syncEngine.js      # Write operations (write only)
├── store/
│   └── canvasStore.js     # Zustand state management
└── utils/
    └── userColor.js       # User color generation
```

## 🔄 Firestore Data Structure

```
canvases/{canvasId}/
├── shapes/{shapeId}       # Individual shape documents
│   ├── id: string
│   ├── type: 'rectangle'
│   ├── x, y: number       # Position
│   ├── width, height: number
│   ├── fill: string       # Color
│   ├── updatedAt: ServerTimestamp
│   ├── clientTimestamp: number
│   └── updatedBy: string  # User UID
├── users/{userId}         # User presence and cursors
│   ├── uid: string
│   ├── displayName: string
│   ├── cursorX, cursorY: number
│   ├── color: string
│   ├── online: boolean
│   ├── lastSeen: ServerTimestamp
│   └── viewport: { x, y, zoom, updatedAt } # Per-user viewport persistence
└── metadata              # Canvas metadata
    ├── createdAt: ServerTimestamp
    └── createdBy: string
```

## 🔮 Roadmap & Next Features

### ✅ Completed (Post-MVP)
- ✅ **Multi-select and layer management** - Drag-to-select, z-index controls, Layer Panel
- ✅ **Delete and duplicate operations** - Full keyboard shortcut support
- ✅ **Enhanced interaction** - Space+drag panning, multi-shape operations
- ✅ **Copy/Paste system** - Clipboard support with relative positioning
- ✅ **Canvas Export** - Export to PNG, SVG, or JSON formats
- ✅ **Window Resize Handling** - Graceful canvas adaptation to window changes
- ✅ **Viewport Persistence** - Per-user zoom/pan saved to Firestore
- ✅ **Arrow Key Nudging** - Fine-grained shape positioning control
- ✅ **Keyboard Shortcuts Help** - Comprehensive shortcut reference (Ctrl+?)

### 🚧 Phase 2: Additional Shapes (Next)
- Ellipse and text shape types
- Resize and rotation handles  
- Color picker and styling options

### 🔮 Phase 3: AI Agent (Future)
- Natural language shape creation ("Create a red ellipse")
- AI-powered layout assistance ("Arrange these in a grid")
- Complex operation planning
- Chat interface for commands

## ⚠️ Current Limitations

### Shape Types & Editing:
- **Limited shape types:** Only rectangles (ellipse, text coming in next release)
- **No resize/rotation:** Shapes are fixed size after creation (transform system in development)
- **No color editing:** Default colors only (color picker in development)
- **No copy/paste between browsers:** Clipboard is per-browser session only

### Canvas & Access:
- **Single canvas:** All users share one canvas (`default-canvas`)
- **No access control:** No distinction between canvas owners and collaborators  
- **Basic error handling:** Network errors may require refresh

### UI/UX Issues:
- **Minimal interface:** Very basic toolbar and UI styling
- **Username scaling:** User labels zoom with canvas content instead of staying readable
- **Update dependencies:** Some UI components (like active users list) only refresh during mouse movement

### Technical Limitations:
- **Presence detection delay:** Takes ~30 seconds to detect when users close their browser tab
- **Conflict resolution testing:** Multi-user conflict scenarios need more comprehensive testing
- **Firestore quotas:** Heavy usage may hit free tier limits
- **Security rules:** Currently in test mode (open access)
- **Mobile support:** Optimized for desktop browsers

### Performance Notes:
- **Shape limit:** Performance tested up to 50 shapes
- **User limit:** Tested with 2-5 concurrent users
- **Network dependency:** Requires stable internet for sync

## 🤝 Contributing

### Before Making Sync Changes:
1. **Read `SYNC_RULES.md`** - Contains critical architecture rules
2. **Test with multiple browsers** - Always verify multiplayer functionality  
3. **Monitor console logs** - Watch for echo prevention and errors
4. **Check performance** - Maintain 60 FPS during interactions

### Development Workflow:
1. Make changes in a feature branch
2. Test locally with 2+ browser windows
3. Verify no infinite loops or ghost objects
4. Deploy to staging environment
5. Test deployed version before merging

## 📸 Screenshots

*[Screenshots will be added after deployment testing]*

- **Multiplayer Demo:** Two users editing simultaneously
- **Canvas Interface:** Toolbar, online users, connection status
- **Architecture Diagram:** Real-time sync flow visualization

## 🎥 Demo Video

*[Demo video will be added after final testing]*

**Planned demo scenarios:**
- Real-time collaboration between multiple users
- Sync architecture under stress (rapid edits)
- Connection handling (disconnect/reconnect)
- Performance demonstration (60 FPS, low latency)

---

## 🏆 Project Status

**✅ ENHANCED CANVAS COMPLETE** - Multi-select, layer management, and advanced interactions implemented

**Ready for Phase 2** - Additional shape types, transforms, and AI integration

Built for the 7-day CollabCanvas sprint challenge with focus on **bulletproof multiplayer architecture** over feature quantity.