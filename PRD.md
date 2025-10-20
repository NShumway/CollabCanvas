# CollabCanvas - Product Requirements Document

## Executive Summary

CollabCanvas is a real-time collaborative design tool that combines multiplayer canvas editing with AI-powered design assistance. Users can work together simultaneously on a shared canvas while leveraging an AI agent to create and manipulate design elements through natural language commands.

**Current Status:** MVP complete with proven real-time sync  
**Goal:** Feature-complete collaborative design tool with integrated AI creation and manipulation

---

## Development Phases

### Phase 1: MVP Foundation ✅ COMPLETE
Robust collaborative foundation with reliable sync confirmed.

### Phase 2: Core Canvas Features
Add key creation, transformation, and manipulation tools for a full design workflow.

### Phase 3: AI Agent Integration  
Integrate a stateless AI system for natural-language-driven design operations.

### Phase 4: Advanced Features & Polish
Add professional-grade usability features and performance optimization.

---

## Tech Stack

### Frontend
- **Framework:** React 18 + Vite  
- **Language:** TypeScript (strict mode)  
- **Canvas Library:** React-Konva (Canvas API wrapper)  
- **State Management:** Zustand  
- **Styling:** Tailwind CSS  

### Backend
- **Real-time Sync:** Firebase Firestore  
- **Authentication:** Firebase Auth (Google OAuth)  
- **Hosting:** Firebase Hosting  

### AI Integration
- **Model:** OpenAI GPT-4o  
- **Method:** Function calling for structured canvas manipulation  
- **Interface:** Chat panel with session memory (stateless beyond session)

---

## Architecture Overview

**Hybrid Local-First State Architecture**
- Local state is the source of truth for user actions  
- Optimistic updates for instant response (60 FPS)  
- Debounced sync to Firestore (~100ms batches)  
- Firebase listeners propagate remote updates  
- Timestamp-based conflict resolution ("last write wins")  
- Three tiers: Rendering, Sync Tracking, Connection Monitoring  

---

## Feature Inventory

### ✅ COMPLETE: Foundation & Real-Time Collaboration

**Deployment & Infrastructure**
- ✅ Firebase Hosting & configuration  
- ✅ Production build pipeline  

**Authentication & Identity**
- ✅ Google OAuth sign-in  
- ✅ Display name from email prefix  
- ✅ Persistent sessions  

**Real-Time Collaboration**
- ✅ Multiplayer cursors with names (<50ms latency)  
- ✅ User color assignment  
- ✅ Presence system (online list)  
- ✅ Graceful disconnect/reconnect  
- ✅ Real-time shape sync (<100ms latency)  
- ✅ Timestamp-based conflict resolution  

**State Persistence**
- ✅ Canvas state saved to Firestore  
- ✅ Auto-save on every change  
- ✅ Refresh restores full state  

**Canvas Core**
- ✅ Pan, Zoom (0.1x–3x)  
- ✅ 60 FPS rendering  

**Shape Creation & Manipulation**
- ✅ Rectangle tool  
- ✅ Drag to move  
- ✅ Visual selection indicator  
- ✅ Single selection  

---

### 🎯 CORE REQUIREMENTS: Essential Canvas Features

**Multi-Select**
- Shift-click, drag-select, Ctrl+A  
- Multi-drag with relative positions  
- Conflict-safe selection state  

**Delete**
- Delete key removes selected shapes  
- Multi-delete  
- Real-time sync across users  

**Additional Shapes**
- Circle/Ellipse, Line, Text  
- All follow shared sync pattern  

**Transform System**
- Resize (8 handles), rotate, aspect lock  
- Live preview during transform  
- Debounced sync during drag  

**Text Editing**
- Double-click to edit inline  
- Font size, alignment, color  

**Duplicate**
- Ctrl+D to duplicate  
- Offset positioning  
- Multi-duplicate support  

**Z-Index & Layer Management**
- Bring forward/back  
- Layer panel UI  
- Keyboard shortcuts (Ctrl+], Ctrl+[)  
- Real-time order sync  

---

### 🎯 CORE REQUIREMENTS: AI Canvas Agent

**AI Infrastructure**
- GPT-4o via function calling  
- Chat interface with message history  
- Loading indicators, Ctrl+K shortcut  

**AI Command Categories**
- **Creation:** Create shapes or text with specific properties  
  > e.g. "Create a red ellipse at 100, 200"  
- **Manipulation:** Move, resize, rotate, recolor  
  > e.g. "Move the red ellipse to the center"  
- **Layout:** Arrange or distribute shapes  
  > e.g. “Arrange these in a row”, “Make a 3x3 grid”  
- **Complex:** Multi-step UI patterns  
  > e.g. “Create a login form”, “Build a navigation bar”  

**AI Execution Model**
- Stateless per session (no memory across reloads)  
- Parallel execution for all users (existing sync handles conflicts)  
- Each AI-created element tagged with metadata  
- Safe failure: invalid commands are ignored gracefully  

**Tool Schema (minimum 8 tools)**
```js
createShape, updateShape, deleteShapes, duplicateShapes,
arrangeShapes, alignShapes, distributeShapes,
getCanvasState, getSelectedShapes
```

**Example Function Call**
```js
{
  name: "updateShape",
  arguments: { id: "ellipse123", x: 400, y: 300 }
}
```

---

### 🎯 CORE REQUIREMENTS: Power Features

**Color Picker**
- Persistent saved colors per user  
- Recent colors  
- Multi-select color application  
- Hex input and quick swatches  

**Keyboard Shortcuts**
- Delete, Duplicate (Ctrl+D)  
- Copy/Paste (Ctrl+C/V)  
- Select All (Ctrl+A)  
- Z-index (Ctrl+], Ctrl+[)  
- Move (Arrow keys - 10px, Shift+Arrow - 50px), Escape (deselect)  
- Help overlay (Ctrl+?)

**Copy/Paste**
- Per-user clipboard  
- Multi-copy/paste preserving relative positions  

**Canvas Export**
- Export as PNG, SVG, or JSON format
- Export full canvas or current viewport
- Include metadata (timestamp, shape count, user count)
- Download button in toolbar

**Window Resize Handling**
- Graceful resize with preserved coordinate system
- Canvas top-left stays anchored
- Dynamic viewport adjustment (show more/less space)
- Toolbars stay positioned at edges (left, top, right)

**Viewport Persistence**
- Per-user zoom and pan positions saved to Firestore
- Auto-restore viewport on reload/refresh
- Debounced saves (500ms after pan/zoom stops)
- Each user maintains their own view independently

**Alignment Tools**
- Align left/center/right, top/middle/bottom  
- Distribute horizontally/vertically  
- Works with multi-select  
- Toolbar buttons  

**Collaborative Comments**
- Comment tool + canvas pins  
- Threaded replies  
- Resolve/unresolve  
- Show/hide resolved  
- Real-time and persistent (Firestore collection)  
- Optional shape attachment  

---

### 🔧 PERFORMANCE & POLISH

**Performance Optimization**
- Shape culling (viewport rendering)  
- React.memo + selective Zustand subscriptions  
- Batch rendering  
- Target: 500+ shapes at 60 FPS  

**Scaling (Bonus)**
- Virtualization, Web Workers, IndexedDB caching  
- Target: 1000+ shapes at 60 FPS  

**UI/UX**
- Smooth animations  
- Consistent design system  
- Clear error feedback  

---

## Performance Targets

| Metric | Core | Stretch |
|--------|------|----------|
| FPS | 60 FPS | 60 FPS @ 500+ shapes |
| Sync Latency | <100ms (shapes) | — |
| AI Response | <2s simple, <5s complex | — |
| Concurrent Users | 4–5 | 10+ |

---

## Technical Architecture

### Zustand Store

**Current MVP**
```js
{
  shapes: { [id]: { type, x, y, width, height, fill, updatedAt, ... } },
  selectedIds: [],
  viewport: { x, y, zoom },
  users: { [uid]: { name, cursorX, cursorY, color, online } },

  pendingWrites: { [shapeId]: timestamp },
  currentUser: { uid, displayName, color },
  connectionState: 'connected' | 'disconnected' | 'reconnecting',
  lastSyncTimestamp: number
}
```

**Phase 2–4 Additions**
```js
{
  createMode: 'rectangle' | 'ellipse' | 'text' | null,
  clipboard: { shapes: [], timestamp: number },
  transforming: { shapeId, mode: 'resize' | 'rotate' | null },
  editingTextId: null,
  
  viewportSaveDebounceTimer: NodeJS.Timeout | null, // For viewport persistence

  aiCommands: { [id]: { status, userId, message, timestamp } },
  chatMessages: [{ role, content, timestamp }],
  aiProcessing: false,

  recentColors: ['#ff0000', '#00ff00'],
  savedColors: ['#000000', '#ffffff'],
  comments: { [id]: { text, author, x, y, replies, resolved } }
}
```

### Shape Architecture

**Unified Bounding Box Model**
All shapes use consistent `x, y, width, height` properties:
- `x, y`: Top-left corner of bounding box (farthest left/up the shape extends)
- `width, height`: Dimensions of axis-aligned bounding box
- `rotation?`: Optional rotation transform applied within the bounding box

**Shape Types:**
- `rectangle`: Renders exactly within bounding box (when rotation=0)
- `ellipse`: Renders as ellipse fit within bounding box (radiusX=width/2, radiusY=height/2)  
- `text`: Renders text within container box (Figma-style text containers)

**Benefits:** Consistent transforms, collision detection, and multi-select operations across all shape types.

### Firestore Collections

```
/canvases/{canvasId}/
  shapes/{shapeId}
    id, type, x, y, width, height, fill, rotation?, fontSize?, text?, zIndex
    updatedAt (ServerTimestamp), updatedBy

  users/{userId}
    uid, displayName, cursorX, cursorY, color, online, lastSeen
    viewport: { x, y, zoom, updatedAt } (per-user viewport persistence)

  comments/{commentId}
    text, author, x, y
    replies: [{ author, text, timestamp }]
    resolved, createdAt, attachedToShape (optional)
```

### Sync Rules

**Write Path**
```
User Action → Update Zustand → Queue Write → Firestore
```

**Read Path**
```
Firestore Listener → Timestamp Check → Update Zustand
```

**Rules**
- Separate read/write paths  
- Server timestamps authoritative  
- Local pendingWrites prevent echoes  
- Always test in 2+ concurrent browsers  

### AI Execution Flow
```
User Input → OpenAI (function calling)
             ↓
   Function Calls Returned
             ↓
   Execute Sequentially → Update Zustand → Queue Firestore Write
             ↓
   Sync Propagates to All Users
```
All AI edits follow normal sync paths, ensuring deterministic replication.

---

## Feature Implementation Timeline

### Phase 2: Core Canvas (Days 2–4)
**Day 2:** Multi-select, delete, new shapes  
**Day 3:** Text editing, transforms  
**Day 4:** Z-index, layer panel, duplication  
✅ Verified 2-browser sync after each stage  

### Phase 3: AI Integration (Days 5–6)
**Day 5:** OpenAI integration, chat UI, core commands  
**Day 6:** Layout + complex commands, multi-user tests  

### Phase 4: Advanced Features & Polish (Day 7)
**Morning:** Color picker, copy/paste, shortcuts, alignment  
**Afternoon:** Comments, performance pass, bug fixes  
✅ Final test & demo prep  

---

## Critical Success Factors

**Technical**
- Maintain proven sync isolation (no mixed paths)  
- Extend existing sync pattern to all new features  
- TypeScript ensures type safety across complex collaborative features
- Test every feature with 2+ browsers  

**Feature**
- All core design + AI capabilities complete  
- 8+ functional AI tools  
- Power-user features implemented  

**Quality**
- Polished Tailwind UI  
- Responsive performance (60 FPS)  
- Clear feedback and animations  

---

## Deliverables

1. **GitHub Repository**  
   - Clean, documented codebase  
   - Updated README + architecture notes  
   - Deployed link  

2. **Demo Video (3–5 min)**  
   - Multi-user collaboration  
   - AI command showcase  
   - Feature walkthrough  

3. **AI Development Log**  
   - Tools & workflow summary  
   - Prompting strategies  
   - Code analysis or learnings  
   - Include representative prompts/responses  

4. **Deployed App**  
   - Public Firebase URL  
   - 5+ users supported concurrently  
   - All features functional  

---

## Conclusion

CollabCanvas builds on a battle-tested real-time foundation to deliver a feature-complete, AI-augmented design tool. Every user and AI operation flows through the same sync architecture, guaranteeing consistent, conflict-resilient collaboration across all sessions.

**Core Strategy:**  
- Build every feature atop the existing sync layer  
- Keep AI stateless, safe, and integrated into normal operations  
- Prioritize smooth collaboration, instant feedback, and resilient performance  

