# CollabCanvas — Task List (PR-by-PR, agent-executable)

**Guidelines / conventions**
- `canvasId = "default-canvas"` unless task says otherwise.
- Use `useCanvasStore()` (Zustand) as the store API unless stated.
- `SyncEngine` is write-only; `useFirestoreSync` is read-only. NEVER mix listeners into write paths.
- All Firestore writes that create/update shapes must set `updatedAt: serverTimestamp()` and `clientTimestamp: Date.now()` fields.
- AI tool actions must go through `ToolRunner.execute(toolName, args)` which then calls `SyncEngine.applyLocalChange()` and `SyncEngine.queueWrite()`.
- Tests must be done locally with **2 browser windows** for collaborative tests.

---

## ✅ COMPLETED: MVP Foundation (PRs 1-7)

The following PRs have been completed successfully:
- **PR #1**: Project Setup & Initial Deployment 
- **PR #2**: Zustand Store & Auth (Google OAuth, AuthGuard)
- **PR #3**: Canvas Core (Konva Stage, pan/zoom, rectangle shapes)
- **PR #4**: Sync Engine (Write path, debounced batching)  
- **PR #5**: Firestore Read Path (Listeners, echo prevention)
- **PR #6**: Cursor Sync (Real-time multiplayer cursors)
- **PR #7**: Presence & Connection State (Online users, disconnect handling)

**MVP Status:** ✅ **Real-time collaborative canvas with bulletproof sync confirmed**

---

## PR #8 — Multi-Select, Delete, Duplicate, Z-index, Layer Panel
**Goal:** Implement multi-select, delete key, duplicate, and z-index management.

### Tasks
1. Multi-select UI & store actions
   - Add actions: `addToSelection(id)`, `removeFromSelection(id)`, `clearSelection()`, `selectAll()`.
   - Drag-to-select rectangle; select shapes in bbox.
   - Shift-click to add to selection.
2. Delete functionality
   - Delete key removes selected shapes via `SyncEngine.deleteShapes([ids])`.
   - Multi-delete support.
3. Duplicate
   - Ctrl+D duplicates selected shapes with offset, new IDs, and syncs them.
   - Multi-duplicate support maintaining relative positions.
4. Z-index management
   - Add `zIndex` field to shape schema in Firestore.
   - Implement bring forward/back functions.
   - Add `LayerPanel` component for visual layer reordering.
   - Keyboard shortcuts (Ctrl+], Ctrl+[).
5. **Unit Tests**: Multi-select logic, delete operations, z-index calculations
6. Acceptance: Multi-select, delete, duplicate, and z-order persist across all clients.

---

## PR #9 — Additional Shapes: Circle, Line, Text
**Goal:** Add circle, line, and text shape types with full sync support.

### Tasks
1. **Circle shape implementation**
   - Add `circle` type with `x, y, radius, fill` properties.
   - Update `Shape.jsx` to render `<Circle>` components.
   - Add circle creation tool to toolbar.
2. **Line shape implementation**
   - Add `line` type with `points` array property.
   - Update `Shape.jsx` to render `<Line>` components.
   - Add line drawing tool with click-drag interface.
3. **Text shape implementation**
   - Add `text` type with `text, fontSize, fontFamily, textAlign, fill` properties.
   - Update `Shape.jsx` to render `<Text>` components.
   - Add text creation tool to toolbar.
4. **Unit Tests**: New shape creation, rendering, and sync
5. Acceptance: All shape types create, render, and sync correctly across clients.

---

## PR #10 — Transform System (Resize, Rotate, Aspect Lock)
**Goal:** Implement resize handles, rotate, aspect lock, live preview and debounced sync.

### Tasks
1. **Konva.Transformer integration**
   - Show transformer handles for selected shapes.
   - Live preview during transform operations.
   - Debounced sync writes during continuous transforms.
2. **Transform controls**
   - Resize handles (8 directional).
   - Rotation handle.
   - Aspect lock toggle in toolbar.
3. **Multi-shape transforms**
   - Transform multiple selected shapes together.
   - Maintain relative positions and proportions.
4. **Unit Tests**: Transform calculations, debouncing logic
5. Acceptance: Real-time transform preview with synced final state.

---

## PR #11 — Text Inline Editing & Font Controls  
**Goal:** Add double-click text editing and font styling controls.

### Tasks
1. **Inline text editing**
   - Double-click text shapes to enter edit mode.
   - DOM input overlay positioned over Konva text.
   - Edit mode state management in store.
2. **Font controls**
   - Font size picker in toolbar.
   - Text alignment buttons (left/center/right).
   - Font family selector.
3. **Text editing sync**
   - Real-time text content sync.
   - Font property changes sync immediately.
4. **Unit Tests**: Text editing state management, font property updates
5. **Code Cleanup Sweep #1**: 
   - Remove unused imports and dead code
   - Clean up commented-out code blocks
   - Consolidate duplicate utility functions
   - Review and clean package.json dependencies
6. Acceptance: Inline text edits sync correctly across all clients.

---

## PR #12 — Alignment Tools & Distribution
**Goal:** Add align and distribute tools for selected shapes.

### Tasks
1. **Alignment functions**
   - Implement `alignShapes(shapeIds, alignment)` helper.
   - Support: left, center, right, top, middle, bottom alignment.
   - Work with multi-selected shapes.
2. **Distribution functions**
   - Implement `distributeShapes(shapeIds, direction)` helper.
   - Support horizontal and vertical distribution.
3. **Toolbar integration**
   - Alignment button group in toolbar.
   - Distribution button group.
   - Enable/disable based on selection count.
4. **Unit Tests**: Alignment calculations, distribution algorithms
5. Acceptance: Alignment and distribution operations visible across all clients.

---

## PR #13 — Color Picker & Palette Management
**Goal:** Add color picker with saved and recent colors.

### Tasks
1. **Color picker component**
   - Full color picker with hex input.
   - Recent colors row (session-based).
   - Saved colors palette (user-persistent).
2. **Color application**
   - Apply colors to selected shapes.
   - Support multi-selection color changes.
   - Update shape `fill` property and sync.
3. **Palette persistence**
   - Save user color palettes to Firestore `users/{uid}/palette`.
   - Load saved colors on login.
4. **Unit Tests**: Color picker logic, palette persistence
5. Acceptance: Color changes sync immediately; saved palettes persist across sessions.

---

## PR #14 — Copy/Paste & Keyboard Shortcuts
**Goal:** Implement internal clipboard and comprehensive keyboard shortcuts.

### Tasks
1. **Internal clipboard system**
   - Copy selected shapes to clipboard store slice.
   - Paste with offset positioning.
   - Preserve relative positions in multi-shape copies.
2. **Keyboard shortcuts**
   - Copy (Ctrl+C), Paste (Ctrl+V).
   - Select All (Ctrl+A), Delete key.
   - Duplicate (Ctrl+D), Undo prevention message.
   - Arrow keys for nudging selected shapes.
   - Escape to clear selection.
3. **Help overlay**
   - Keyboard shortcut help (Ctrl+?).
   - Modal overlay with shortcut list.
4. **Unit Tests**: Clipboard operations, keyboard event handling
5. **Code Cleanup Sweep #2 (Pre-AI)**:
   - Audit all components for unused props/state
   - Remove temporary debugging code and console.logs
   - Clean up store actions - consolidate similar functions
   - Review file structure - move misplaced files to correct directories
6. Acceptance: Copy/paste maintains relative layouts; all shortcuts work consistently.

---

## PR #15 — AI Integration: Foundation + Core Tool
**Goal:** Integrate OpenAI GPT-4o with basic infrastructure and 1 core tool.

### Tasks
1. **OpenAI integration**
   - `src/services/openai.js` - Function calling wrapper.
   - API key management and error handling.
   - Response parsing and validation.
2. **ToolRunner system**
   - `src/services/toolRunner.js` - Maps AI functions to SyncEngine operations.
   - Error handling and user feedback.
   - Standard execution pattern for all tools.
3. **AI state management**
   - `src/hooks/useAI.js` - AI processing state.
   - Chat message history (session-only).
   - Loading and error states.
4. **Chat interface**
   - `src/components/UI/ChatPanel.jsx` - Chat UI.
   - Message history display.
   - Input field with keyboard shortcut (Ctrl+K).
5. **First AI tool: createShape**
   - `createShape(type, x, y, properties)` function.
   - Support all shape types (rectangle, circle, line, text).
   - Route through normal sync pipeline.
6. **Testing**
   - **Unit Tests**: OpenAI wrapper, ToolRunner execution.
   - **Manual Tests**: "Create a red circle at 100, 200"
7. Acceptance: AI can successfully create shapes that sync to all clients.

---

## PR #16 — AI: Essential Tools Expansion  
**Goal:** Add 3 more essential AI tools for shape manipulation.

### Tasks
1. **Core manipulation tools**
   - `updateShape(id, properties)` - Modify existing shapes.
   - `deleteShapes(shapeIds)` - Remove shapes by ID.
   - `getCanvasState()` - Return current canvas context for AI.
2. **Enhanced AI context**
   - Canvas state awareness in prompts.
   - Shape selection and identification.
   - Better error messages for invalid operations.
3. **Tool chaining**
   - Allow AI to use multiple tools in sequence.
   - Handle complex multi-step operations.
4. **Testing**
   - **Unit Tests**: New tool functions and validation.
   - **Manual Tests**: "Move the red circle to 300, 400" and "Delete all blue shapes"
5. Acceptance: AI can modify, delete, and reason about existing canvas content.

---

## PR #17 — AI: Layout & Composite Tools
**Goal:** Add advanced layout tools and template creation.

### Tasks
1. **Layout tools**
   - `arrangeShapes(shapeIds, pattern)` - Grid, row, column arrangements.
   - `alignShapes(shapeIds, alignment)` - Align shapes using existing alignment system.
   - `distributeShapes(shapeIds, direction)` - Even distribution.
   - `createTemplate(template, position)` - UI patterns (login form, button set).
2. **Simple conflict handling**
   - **Last write wins** for simultaneous AI operations.
   - User notification when multiple users use AI simultaneously.
   - No complex rollback - rely on existing sync conflict resolution.
3. **Advanced prompting**
   - Support complex multi-step operations.
   - Template library for common UI patterns.
4. **Testing**
   - **Unit Tests**: Layout algorithms and template creation.
   - **Manual Tests**: "Create a login form" and "Arrange these shapes in a 3x3 grid"
5. **Code Cleanup Sweep #3 (Post-AI)**:
   - Review AI service files for unused functions
   - Clean up tool implementations - remove experimental code
   - Audit error handling consistency across AI tools
   - Remove any temporary AI testing/debugging utilities
6. Acceptance: AI can create complex layouts and handle basic multi-user scenarios.

---

## PR #18 — Collaborative Comments System
**Goal:** Add comment pins on canvas with threaded replies and real-time sync.

### Tasks
1. **Comment data structure**
   - Firestore `comments/{commentId}` collection.
   - Schema: `text, author, x, y, replies, resolved, createdAt`.
   - Optional `attachedToShape` field for shape-specific comments.
2. **Comment UI components**
   - Comment tool in toolbar.
   - Canvas comment pins with visual indicators.
   - Comment thread panel with replies.
   - Resolve/unresolve functionality.
3. **Real-time comment sync**
   - Comment creation and updates sync immediately.
   - Reply threads update in real-time.
   - Show/hide resolved comments toggle.
4. **Testing**
   - **Unit Tests**: Comment creation, reply threading.
   - **Manual Tests**: Multi-user comment conversations.
5. Acceptance: Threaded comments with real-time collaboration across all clients.

---

## PR #19 — Polish, Documentation & Deployment
**Goal:** Final UI polish, comprehensive documentation, and deployment preparation.

### Tasks
1. **UI/UX Polish**
   - Consistent Tailwind design system.
   - Smooth transitions and loading states.
   - Error message improvements.
   - Responsive design touch-ups.
2. **Documentation**
   - Update README with full feature list.
   - Write SYNC_RULES.md explaining architecture.
   - Create AI_DEVELOPMENT_LOG.md with implementation notes.
   - Add inline code documentation.
3. **Testing & Validation**
   - Comprehensive manual testing checklist.
   - Performance validation (60 FPS, <100ms sync).
   - Multi-user stress testing.
4. **Deployment**
   - Production build optimization.
   - Firebase hosting configuration.
   - Environment variable setup.
5. **Final Code Cleanup Sweep**:
   - Remove all console.logs and debugging statements
   - Clean up unused CSS classes and Tailwind utilities
   - Audit and remove unused files (components, utils, assets)
   - Final package.json cleanup - remove dev dependencies not needed for production
   - Check for and remove any temporary files (.env.backup, test files, etc.)
   - Validate all imports are actually used
   - Remove commented-out code blocks throughout codebase
6. Acceptance: Production-ready deployment with complete documentation.

---

## FLEX GOALS (Optional Enhancements)

### PR #20 — Performance Optimization (Flex Goal)
**Goal:** Scale to 500+ shapes while maintaining 60 FPS performance.
- Implement viewport-based shape culling
- Optimize re-renders with React.memo
- Add selective Zustand subscriptions
- Optional Web Worker integration for heavy operations

### PR #21 — Advanced Features (Flex Goal) 
**Goal:** Professional-grade features for power users.
- Multi-canvas support with routing
- Advanced keyboard shortcut customization  
- Export/import functionality (JSON, SVG)
- Advanced shape grouping and locking

### PR #22 — Auth & Security (Flex Goal)
**Goal:** Production-grade security and session management.
- Handle auth token expiry gracefully
- Implement Firestore security rules
- Add user session monitoring
- Basic usage analytics and monitoring

### PR #23 — Advanced UI/UX (Flex Goal)
**Goal:** Premium user experience enhancements.
- Advanced loading spinners and progress indicators
- Toast notification system
- Smooth animations and micro-interactions
- Dark mode support
- Accessibility improvements (ARIA labels, keyboard navigation)

---

## Implementation Guidelines

### **Testing Strategy**
- **Unit Tests**: Core logic, store actions, utility functions
- **Integration Tests**: Multi-component workflows, sync scenarios  
- **Manual Testing**: Always use 2+ browser windows for collaborative features
- **Performance Testing**: Monitor FPS and sync latency during development

### **Code Cleanup Strategy**
- **Cleanup Sweep #1** (PR #11): After core canvas features - remove early development artifacts
- **Cleanup Sweep #2** (PR #14): Pre-AI integration - ensure clean foundation for AI features  
- **Cleanup Sweep #3** (PR #17): Post-AI integration - clean up AI development artifacts
- **Final Cleanup** (PR #19): Pre-deployment - production-ready code audit

### **Cross-PR Acceptance Criteria**
- **Sync Rules**: Maintain separation of read/write paths throughout
- **Two-Browser Testing**: All collaborative features must work across multiple clients
- **Performance Targets**: 60 FPS rendering, <100ms sync latency
- **Code Quality**: Unit tests for complex logic, consistent error handling
- **Documentation**: Update relevant docs with each significant feature addition

### **Conflict Resolution Philosophy**
- **Simple approach**: Timestamp-based "last write wins" for all operations
- **User feedback**: Notify users when simultaneous edits occur
- **No complex rollbacks**: Rely on proven sync architecture for consistency
- **AI operations**: Follow same conflict resolution as human operations

