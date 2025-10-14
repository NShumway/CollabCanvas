# CollabCanvas - Product Requirements Document

## Executive Summary

CollabCanvas is a real-time collaborative design tool that combines multiplayer canvas editing with AI-powered design assistance. Users can work together simultaneously on a shared canvas while leveraging an AI agent to create and manipulate design elements through natural language commands.

**Timeline:** 7-day sprint with 24-hour MVP gate  
**Target:** Demonstrate production-ready collaborative infrastructure with intelligent AI co-creation

---

## Project Phases

### Phase 1: MVP (24 Hours) - HARD GATE
Prove the collaborative foundation is solid. Focus on multiplayer infrastructure, not features.

### Phase 2: Core Canvas (Days 2-4)
Expand canvas capabilities and polish collaboration features.

### Phase 3: AI Agent (Days 5-7)
Build and refine the AI canvas manipulation system.

---

## Tech Stack

### Frontend
- **Framework:** React 18 with Vite
- **Canvas Library:** React-Konva (high-level API, good performance, React integration)
- **State Management:** Zustand (lightweight, perfect for canvas state)
- **Styling:** Tailwind CSS
- **Build Tool:** Vite (fast HMR, optimized builds)

### Backend
- **Real-time Sync:** Firebase Firestore (built-in real-time listeners)
- **Authentication:** Firebase Auth with Google OAuth
- **Persistence:** Firestore collections for canvas state
- **Hosting:** Firebase Hosting or Vercel

### AI Integration
- **Model:** Anthropic Claude Sonnet 4
- **Method:** Function calling for canvas manipulation
- **Interface:** Chat panel for natural language commands

### State Management Architecture
**Hybrid Local-First Approach:**
- Local React state as source of truth for user's own actions
- Optimistic updates for instant feedback (60 FPS)
- Debounced sync to Firestore (100ms batches during continuous actions)
- Firebase listeners for remote changes
- Timestamp-based "last write wins" conflict resolution

---

## User Stories

### MVP User Stories (Priority 1 - Must Have)

**As a developer, I want to:** (Setup - Do First)
1. Initialize a React + Vite project so I have a fast development environment
2. Set up Firebase project with Firestore and Auth enabled so I have backend services
3. Configure environment variables for API keys so the app can connect to services
4. Deploy a "Hello World" version publicly so I can verify deployment works early
5. Set up Zustand store structure so I have state management ready
6. Install and configure React-Konva so I can render canvas elements

**As a designer, I want to:**

7. Sign in with my Google account so I have a persistent identity

8. See a canvas where I can pan and zoom so I can navigate a large workspace

9. Create a single shape type (rectangle only for MVP) so I can start designing

10. Click and drag shapes to move them so I can arrange my design

11. See other users' cursors with their names so I know who's working where

12. See who else is currently online so I know who I'm collaborating with

13. Have my changes appear instantly for other users so we can work in real-time

14. See other users' changes appear on my canvas so I stay in sync

15. Refresh my browser and see all my work persisted so I don't lose progress

16. Access the app from a public URL so I can share it with teammates

**Technical Requirements:**
- Project initialization (Vite + React setup)
- Firebase project creation and configuration
- Environment variable setup (.env files)
- Early deployment to Firebase Hosting or Vercel (within first 2 hours)
- Zustand store scaffolding
- React-Konva installation and basic setup
- Authentication flow with user profiles
- Canvas viewport with pan (drag to move) and zoom (scroll wheel)
- Shape creation (rectangles only - click to place)
- Shape manipulation (drag to move)
- Real-time cursor broadcasting (<50ms sync)
- Real-time shape state sync (<100ms sync)
- Presence system (online/offline status)
- State persistence in Firestore
- Deployed and accessible application

### Post-MVP User Stories (Priority 2 - Core Canvas)

**As a designer, I want to:**
17. Create circles and lines in addition to rectangles so I have more design flexibility
18. Add text layers with custom content so I can include labels and copy
13. Resize shapes by dragging handles so I can adjust dimensions
14. Rotate shapes so I can create angled layouts
15. Change shape colors so I can create visual hierarchy
16. Select multiple shapes at once (shift-click or drag-select) so I can manipulate groups
17. Delete shapes I no longer need so I can refine my design
18. Duplicate shapes to quickly create variations
19. See layers organized in a panel so I can manage complex designs
20. Bring shapes forward or send them backward so I can control layering

**Technical Requirements:**
- Additional shape types (Circle, Line, Text)
- Text input and formatting
- Resize handles with aspect ratio support
- Rotation handles and angle display
- Color picker UI
- Multi-select with shift-click and drag-to-select box
- Delete and duplicate operations
- Layer panel with z-index visualization
- Layer reordering (bring to front, send to back)

### AI Agent User Stories (Priority 3 - AI Features)

**As a designer, I want to:**
27. Type natural language commands to create shapes so I can design faster
28. Ask the AI to move or modify existing shapes so I can adjust layouts quickly
29. Request complex layouts (login forms, nav bars) so the AI can handle tedious work
30. See AI-generated elements appear in real-time for all users so collaboration stays in sync
31. Use the AI simultaneously with teammates without conflicts
32. Get feedback when the AI is processing my command so I know it's working
33. See step-by-step execution for complex commands so I understand what's happening

**Example Commands:**
- Creation: "Create a red circle at position 100, 200"
- Manipulation: "Move the blue rectangle to the center"
- Layout: "Arrange these shapes in a horizontal row"
- Complex: "Create a login form with username and password fields"

**Technical Requirements:**
- Chat interface for AI commands
- Claude function calling integration
- Tool schema for canvas operations (create, move, resize, rotate, etc.)
- Context awareness (getCanvasState for AI to understand current canvas)
- Multi-step operation planning and execution
- Real-time sync of AI-generated changes
- Visual feedback during AI processing (loading states)
- Command history log
- At least 6 distinct command types supported

---

## Feature List

### MVP Features (24 Hours)

**Authentication & Identity**
- Google OAuth sign-in
- User display name (use email as display name for MVP)
- Persistent user sessions

**Canvas Core**
- Pan: Click and drag background to move viewport
- Zoom: Mouse wheel to zoom in/out (min/max limits)
- Grid or background color for spatial reference
- Viewport bounds (large but not infinite, ~5000x5000px)

**Shape Creation**
- Rectangle tool only for MVP (click to place, default size)
- Basic solid fill color (default blue)

**Shape Manipulation**
- Click to select shape
- Drag to move selected shape
- Visual selection indicator (border/highlight)

**Real-Time Collaboration**
- Multiplayer cursors (position + user name label)
- Cursor color per user
- Cursor position sync (<50ms)
- Object state sync (<100ms)
- Presence system (user list showing online users)
- Disconnection handling (graceful reconnect)

**Persistence**
- All canvas state saved to Firestore
- Auto-save on every change
- Load canvas state on page load
- State survives all users disconnecting

**Deployment**
- Publicly accessible URL
- Environment variables configured
- README with setup instructions
- Deploy early (within first 2 hours) to catch issues

### Post-MVP Features (Days 2-4)

**Canvas Enhancements**
- Additional shapes: Circle, Line/Path
- Text layers with content editing
- Color picker for all shapes
- Stroke/border options (width, color)

**Advanced Manipulation**
- Resize handles (8-point resize)
- Rotation handle and angle display
- Aspect ratio lock toggle
- Snap-to-grid option
- Keyboard shortcuts (Delete, Ctrl+C/V, Ctrl+Z)

**Selection & Organization**
- Multi-select (shift-click)
- Drag-to-select box
- Select all (Ctrl+A)
- Group/ungroup shapes
- Layer panel with list view
- Reorder layers (z-index)
- Show/hide layers

**Operations**
- Delete selected shapes
- Duplicate shapes (Ctrl+D)
- Copy/paste between positions
- Undo/redo (local only or shared)

**UI Polish**
- Toolbar with tool selection
- Properties panel (position, size, color)
- Minimap for navigation
- Zoom level indicator
- Performance metrics display (FPS counter)

### AI Features (Days 5-7)

**AI Interface**
- Chat panel (slide-out or fixed)
- Command input with send button
- Command history display
- AI response messages

**AI Capabilities - Creation**
- Create shapes with specific properties
- Create text with custom content
- Batch creation (multiple objects at once)

**AI Capabilities - Manipulation**
- Move shapes to positions or relative locations
- Resize shapes by factor or absolute size
- Rotate shapes by degrees
- Change colors and properties

**AI Capabilities - Layout**
- Arrange shapes in rows/columns
- Create grids of shapes
- Even spacing distribution
- Alignment operations (left, center, right, top, middle, bottom)

**AI Capabilities - Complex Operations**
- Multi-step operations (login form, nav bar, card layouts)
- Component templates (buttons, inputs, containers)
- Smart grouping of related elements

**AI Technical Features**
- Function calling with tool schema
- Context awareness (reads current canvas state)
- Multi-step execution with progress
- Error handling and user feedback
- Shared AI state (all users see AI changes)
- Concurrent AI command handling

**AI UX**
- Loading indicators during processing
- Step-by-step visual feedback for complex commands
- Success/error messages
- Command suggestions/autocomplete
- Response latency <2s for simple commands

---

## Performance Targets

### MVP Targets
- **FPS:** 60 FPS during pan and zoom
- **Cursor Sync:** <50ms latency
- **Object Sync:** <100ms latency
- **Concurrent Users:** 2+ users without issues
- **Object Count:** 50+ simple shapes without FPS drops

### Final Targets
- **FPS:** 60 FPS during all interactions (pan, zoom, drag, resize, rotate)
- **Cursor Sync:** <50ms latency
- **Object Sync:** <100ms latency
- **AI Response:** <2s for single-step commands
- **Concurrent Users:** 5+ users without degradation
- **Object Count:** 500+ simple shapes without FPS drops

---

## Technical Architecture Notes

### State Management (Hybrid Approach)

**Local State (Zustand Store):**
```javascript
{
  shapes: { [id]: { type, x, y, width, height, color, rotation, ... } },
  selectedIds: [],
  viewport: { x, y, zoom },
  users: { [uid]: { name, cursor: { x, y }, color, online } }
}
```

**Firestore Collections:**
```
/canvases/{canvasId}/
  - shapes/{shapeId} - individual shape documents
  - users/{userId} - user presence and cursor position
  - metadata - canvas settings, created date, etc.
```

**Sync Flow:**
1. User action (drag shape) → Update local Zustand state immediately
2. Debounced sync (100ms) → Write delta to Firestore
3. Firestore listener → Receive remote changes
4. Merge remote changes → Update local state if timestamp newer

**Conflict Resolution:**
- Last write wins based on `updatedAt` timestamp
- Each shape has `updatedAt` and `updatedBy` fields
- Local changes always take precedence until sync

### Real-Time Sync Strategy

**Cursor Updates:**
- Throttled to 20Hz (50ms intervals)
- Separate Firestore document per user
- No persistence needed

**Shape Updates:**
- During drag: Debounced writes every 100ms
- On drag end: Immediate final write
- Other operations: Immediate write
- Firestore onSnapshot listener for incoming changes

**Presence System:**
- Firestore onDisconnect() hooks
- Heartbeat every 30s
- Mark offline after 45s of no heartbeat

### Canvas Performance Optimization

**Rendering:**
- React-Konva layer separation (background, shapes, selection, cursors)
- Virtualization for layer panel (react-window)
- Memoization of shape components
- Batch updates using Konva.batchDraw()

**Event Handling:**
- Debounce continuous events (drag, resize)
- Throttle high-frequency events (cursor movement)
- Use Konva hit detection for click/hover

**State Updates:**
- Zustand for minimal re-renders
- Selective subscriptions to state slices
- Immer for immutable state updates

### AI Agent Architecture

**Tool Schema:**
```javascript
tools = [
  {
    name: "createShape",
    parameters: { type, x, y, width, height, color, ... }
  },
  {
    name: "updateShape",
    parameters: { shapeId, updates: { x, y, width, height, rotation, color } }
  },
  {
    name: "deleteShape",
    parameters: { shapeId }
  },
  {
    name: "getCanvasState",
    parameters: {}
  },
  {
    name: "arrangeShapes",
    parameters: { shapeIds, layout: "horizontal" | "vertical" | "grid" }
  }
]
```

**Execution Flow:**
1. User types command in chat
2. Send to Claude with function calling
3. Claude returns function calls
4. Execute functions against local canvas API
5. Functions update Zustand → triggers Firestore sync
6. All users see changes via normal sync mechanism

**Complex Operations:**
- AI plans multi-step operations upfront
- Execute steps sequentially with delays for visual feedback
- Store intermediate state in case of errors
- Roll back on failure

---

## Critical Pitfalls to Avoid

### MVP Phase (24 Hours)

❌ **Building features before multiplayer works**
- Pitfall: Adding shapes, colors, resize before sync is solid
- Solution: Get 2 cursors syncing first, then ONE shape syncing, then expand

❌ **Not testing with 2+ browsers early**
- Pitfall: Everything works locally, breaks in multiplayer
- Solution: Open 2 Chrome windows from hour 1, test every feature in both

❌ **Firestore security rules blocking writes**
- Pitfall: Auth works but writes fail silently
- Solution: Start with open rules for dev, add security after MVP

❌ **Optimistic updates causing infinite loops**
- Pitfall: Local update → Firestore write → Firestore listener → Local update → loop
- Solution: Check `hasPendingWrites` metadata, ignore local echoes

❌ **Not handling disconnects**
- Pitfall: User refreshes, loses connection, canvas breaks
- Solution: Implement Firestore onDisconnect() hooks early

❌ **Trying to sync too much data**
- Pitfall: Sending full canvas state on every change
- Solution: Sync deltas (individual shape updates), not full state

❌ **Forgetting deployment until last minute**
- Pitfall: Works locally, deployment issues eat all your time
- Solution: Deploy "Hello World" in first 2 hours, deploy MVP version immediately when it works

### Post-MVP Phase (Days 2-4)

❌ **Breaking multiplayer while adding features**
- Pitfall: New features introduce sync bugs
- Solution: Test every new feature in 2 browsers before moving on

❌ **Performance degradation with many shapes**
- Pitfall: Canvas slows down with 100+ objects
- Solution: Profile early, implement virtualization/culling if needed

❌ **Uncontrolled re-renders**
- Pitfall: Every state change re-renders entire canvas
- Solution: Use React.memo, selective Zustand subscriptions

❌ **Forgetting z-index/layering**
- Pitfall: Shapes overlap unpredictably
- Solution: Assign z-index on creation, maintain order in state

❌ **Poor keyboard shortcut conflicts**
- Pitfall: Shortcuts conflict with browser defaults
- Solution: Use standard conventions (Ctrl+C/V/Z), preventDefault carefully

### AI Phase (Days 5-7)

❌ **AI making too many small changes**
- Pitfall: "Create login form" makes 30 separate Firestore writes
- Solution: Batch AI operations, write atomically

❌ **Not providing enough context to AI**
- Pitfall: AI doesn't know what's on canvas, makes bad decisions
- Solution: Always call getCanvasState first, include in prompt context

❌ **Poor error handling**
- Pitfall: AI fails silently, user has no idea why
- Solution: Show AI reasoning, display errors clearly

❌ **Latency kills UX**
- Pitfall: User waits 5 seconds for simple command
- Solution: Show loading immediately, use Sonnet 4 for speed, optimize prompts

❌ **AI commands conflict with manual edits**
- Pitfall: User editing while AI executes, changes collide
- Solution: Lock edited shapes, queue AI operations, show clear visual feedback

❌ **Vague AI commands produce garbage**
- Pitfall: "Create a form" makes overlapping mess
- Solution: Plan coordinates/spacing upfront, use smart defaults

❌ **Not testing concurrent AI usage**
- Pitfall: Two users give AI commands simultaneously, chaos ensues
- Solution: Queue system or parallel execution with conflict checks

### General Pitfalls

❌ **Scope creep**
- Pitfall: Adding "nice to have" features, missing deadlines
- Solution: Ruthlessly cut features, ship working core over fancy extras

❌ **Poor git hygiene**
- Pitfall: Losing work, can't roll back bad changes
- Solution: Commit frequently, branch for risky changes

❌ **No testing plan**
- Pitfall: Manual testing misses edge cases
- Solution: Document test scenarios, test methodically

❌ **Hardcoded configuration**
- Pitfall: API keys in code, can't deploy
- Solution: Environment variables from day 1

❌ **Not documenting architecture decisions**
- Pitfall: Forget why you did something, make inconsistent changes
- Solution: Comment complex logic, maintain architecture notes

---

## Testing Checklist

### MVP Testing
- [ ] Sign in with Google OAuth works
- [ ] Two browsers can connect simultaneously
- [ ] Both users see each other's cursors with names
- [ ] User list shows who's online
- [ ] Create rectangle appears for both users
- [ ] Drag rectangle syncs position in <100ms
- [ ] Refresh browser, canvas state persists
- [ ] User disconnects, comes back, sees their work
- [ ] Pan and zoom work smoothly at 60 FPS
- [ ] 50+ shapes on canvas, no FPS drop

### Post-MVP Testing
- [ ] Create circles, lines, text
- [ ] Resize shapes with handles
- [ ] Rotate shapes
- [ ] Multi-select with shift-click
- [ ] Drag-to-select box
- [ ] Delete selected shapes
- [ ] Duplicate shapes
- [ ] Layer panel shows correct order
- [ ] All operations work in multiplayer
- [ ] 500+ shapes, still 60 FPS

### AI Testing
- [ ] "Create a red circle" works
- [ ] "Move shape to center" works
- [ ] "Arrange in a row" works
- [ ] "Create login form" makes multiple elements
- [ ] AI changes appear for all users
- [ ] Two users can use AI simultaneously
- [ ] Loading indicator shows during processing
- [ ] Error messages display clearly
- [ ] Response time <2s for simple commands
- [ ] Complex commands execute step-by-step

### Performance Testing
- [ ] Open browser dev tools, monitor FPS
- [ ] Test with network throttling (Fast 3G)
- [ ] Test with 5 concurrent users
- [ ] Create 500+ shapes, measure performance
- [ ] Rapidly create and move shapes
- [ ] Monitor Firestore read/write quotas

---

## Success Metrics

### MVP Success (Pass/Fail Gate)
✅ All MVP features implemented  
✅ 2+ users can edit simultaneously  
✅ Real-time sync works reliably  
✅ State persists across disconnects  
✅ Deployed and publicly accessible  
✅ Basic performance targets met (60 FPS, <100ms sync)

### Final Success (Excellent Submission)
✅ All post-MVP canvas features implemented  
✅ AI agent handles 6+ command types  
✅ Complex AI operations (login form, nav bar) work well  
✅ All performance targets exceeded  
✅ 5+ users work simultaneously without issues  
✅ Polish and UX feel professional  
✅ Clear demo video showing all features  
✅ Comprehensive documentation  
✅ AI Development Log completed

---

## Deliverables

1. **GitHub Repository**
   - Clean, organized code
   - README with setup instructions
   - Architecture overview document
   - Deployed link in README

2. **Demo Video (3-5 minutes)**
   - Show real-time collaboration (2 users)
   - Demonstrate AI commands
   - Explain architecture briefly
   - Highlight interesting technical decisions

3. **AI Development Log (1 page)**
   - Tools used (Cursor, Copilot, Claude, etc.)
   - 3-5 effective prompts that worked well
   - Percentage of AI-generated vs hand-written code
   - Where AI excelled and where it struggled
   - Key learnings about AI-assisted development

4. **Deployed Application**
   - Public URL (Firebase Hosting or Vercel)
   - Supports 5+ concurrent users
   - Authentication enabled
   - All features functional

---

## Timeline Recommendation

### Day 1 (MVP - 24 Hours)
- Hour 0-1: Project setup (Vite + React, Firebase config)
- Hour 1-2: Deploy "Hello World" to verify deployment pipeline
- Hour 2-6: Authentication, basic canvas, pan/zoom
- Hour 6-12: Cursor sync, presence system
- Hour 12-18: Shape creation (rectangles only) and movement sync
- Hour 18-22: Polish, testing, bug fixes
- Hour 22-24: Final testing, deploy updated version, submit MVP

### Days 2-3 (Core Canvas)
- Additional shape types (circle, line, text)
- Resize and rotation
- Multi-select
- Delete and duplicate
- Layer management

### Day 4 (Canvas Polish)
- Color picker and styling
- Keyboard shortcuts
- UI polish (toolbar, properties panel)
- Performance optimization

### Days 5-6 (AI Agent)
- Claude integration
- Function calling setup
- Basic commands (create, move, resize)
- Layout commands (arrange, grid)
- Chat interface

### Day 7 (AI Polish & Submission)
- Complex commands (login form, nav bar)
- Error handling and UX polish
- Testing with multiple users
- Demo video recording
- Documentation
- AI Development Log
- Final submission

---

## Conclusion

This PRD provides a clear roadmap from MVP to final submission. The hybrid state management approach balances simplicity with performance requirements. Focus on multiplayer first, then features, then AI.

**Remember:** A simple canvas with bulletproof multiplayer beats a feature-rich canvas with broken collaboration.