# CollabCanvas — Task List (PR-by-PR, agent-executable)

**Guidelines / conventions**
- `canvasId = "default-canvas"` unless task says otherwise.
- Use `useCanvasStore()` (Zustand) as the store API unless stated.
- `SyncEngine` is write-only; `useFirestoreSync` is read-only. NEVER mix listeners into write paths.
- All Firestore writes that create/update shapes must set `updatedAt: serverTimestamp()` and `clientTimestamp: Date.now()` fields.
- AI tool actions must go through `ToolRunner.execute(toolName, args)` which then calls `SyncEngine.applyLocalChange()` and `SyncEngine.queueWrite()`.
- Tests must be done locally with **2 browser windows** for collaborative tests.

**🔥 LEVERAGE BUILT-IN FEATURES FIRST** (Updated by native feature review)
- **Konva Native Methods**: Use `node.moveToTop()`, `node.moveUp()`, `node.getClientRect()`, `node.absolutePosition()` instead of manual calculations
- **Konva Transformer**: Already properly implemented - continue leveraging all built-in transform features
- **Firebase Real-time**: Already using `onSnapshot()` and `serverTimestamp()` correctly - maintain this pattern
- **Browser APIs**: Consider `navigator.clipboard` for copy/paste (requires HTTPS) with internal fallback
- **Firebase Vertex AI**: Evaluate for AI integration instead of direct OpenAI API calls
- **Selection Rectangle**: Current manual implementation is appropriate (no Konva built-in equivalent)

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
4. Z-index management (**USE KONVA BUILT-INS**)
   - Add `zIndex` field to shape schema in Firestore.
   - **⚠️ LEVERAGE NATIVE**: Use Konva's built-in `node.moveToTop()`, `node.moveUp()`, `node.moveToBottom()`, `node.moveDown()` methods instead of complex fractional z-index calculations.
   - Add `LayerPanel` component for visual layer reordering.
   - Keyboard shortcuts (Ctrl+], Ctrl+[).
   - **⚠️ Note**: Full z-index testing with visual verification will be completed in PR #9 with color features
5. **Unit Tests**: Multi-select logic, delete operations, basic z-index calculations
6. Acceptance: Multi-select, delete, duplicate, and z-order persist across all clients.

---

## PR #8.5 — TypeScript Migration
**Goal:** Convert entire codebase from JavaScript to TypeScript for better type safety and developer experience.

### Tasks
1. **Setup & Configuration**
   - Install TypeScript and necessary @types packages
   - Configure tsconfig.json with appropriate compiler options
   - Update Vite configuration for TypeScript support
   - Convert package.json scripts if needed
2. **Core Files Conversion**
   - Convert all .js/.jsx files to .ts/.tsx
   - Add proper type definitions for all components, hooks, and services
   - Define interfaces for Zustand store state and actions
   - Type Firebase/Firestore data structures
3. **Type Definitions**
   - Create comprehensive type definitions for shapes, users, canvas state
   - Define proper types for all props, state, and function parameters
   - Add types for external libraries (Konva, Firebase, etc.)
4. **Validation & Testing**
   - Resolve all TypeScript compilation errors
   - Update existing tests to work with TypeScript
   - Ensure no type-related runtime issues
5. **Unit Tests**: Type safety validation, no regressions in functionality
6. Acceptance: Full TypeScript compilation with strict mode, all existing functionality preserved.

---

## ✅ COMPLETED: PR #9 — Additional Shapes + Colors + Z-Index Testing
**Goal:** Add ellipse and text shape types with color picker and comprehensive z-index testing.

### Tasks Completed ✅
1. **Ellipse shape implementation** ✅
   - Add `ellipse` type with unified bounding box `x, y, width, height, fill` properties.
   - Update `Shape.jsx` to render `<Ellipse>` components (radiusX=width/2, radiusY=height/2).
   - Add ellipse creation tool to toolbar.
2. **Text shape implementation** ✅
   - Add `text` type with `x, y, width, height, text, fontSize, fontFamily` properties.
   - Update `Shape.jsx` to render `<Text>` components within container boxes.
   - Add text creation tool to toolbar.
3. **Color Picker Integration** ✅
   - Full color picker component with hex input
   - Recent colors row (session-based)
   - Saved colors palette (user-persistent in Firestore users/{uid}/palette)
   - Apply colors to selected shapes with multi-selection support
   - Update shape `fill` property and sync changes
   - **BONUS**: Dynamic selection color adaptation for professional UX
4. **Comprehensive Z-Index Testing** ✅
   - Test z-index functionality with colored shapes for visual verification
   - Validate layer ordering with different shape types and colors
   - Test bring forward/back operations with visual feedback
   - Verify LayerPanel functionality with colored shapes
   - **BONUS**: Performance-optimized fractional z-index system
5. **Unit Tests** ✅: New shape creation, rendering, sync, color picker logic, z-index with colors (59 tests, 100% success rate)
6. **Acceptance** ✅: All shape types create/render/sync correctly, color changes sync immediately, z-index operations work reliably with visual confirmation.

**BONUS ACHIEVEMENTS:**
- Dynamic selection color system (Figma/Sketch UX patterns)
- Enterprise-grade test reliability (eliminated all failing tests)
- Performance-optimized z-index with collision avoidance
- Comprehensive shape system hardening with bulletproof fallbacks

---

## PR #10 — Text Inline Editing & Font Controls  
**Goal:** Add double-click text editing and font styling controls.

### Tasks Completed ✅
1. **Inline text editing** ✅
   - Double-click text shapes to enter edit mode.
   - DOM input overlay positioned over Konva text with pixel-perfect alignment.
   - Edit mode state management in store.
   - Immediate text hiding during edit to prevent double-text display.
   - Auto-height text boxes that expand as user types.
   - Figma-style text creation (immediate edit mode on placement).
2. **Font controls** ✅
   - Font size picker in toolbar with auto-resize on change.
   - Text alignment buttons (left/center/right).
   - Font family selector with common fonts.
   - Bold, italic, underline, strikethrough formatting.
   - Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U).
3. **Text editing sync** ✅
   - Real-time text content sync with auto-height calculation.
   - Font property changes sync immediately with auto-resize.
   - Context-aware color picker (text color vs fill color).
4. **Unit Tests** ✅: Text editing state management, font property updates
5. **Enhanced UX Improvements** ✅
   - Fixed toolbar layout (no canvas shifting when text selected)
   - Text formatting controls appear contextually in main toolbar
   - Preserved text color visibility during selection
   - Professional Figma-like text editing experience
6. **Code Cleanup Sweep #1** ✅: 
   - Remove unused imports and dead code ✅
   - Clean up commented-out code blocks ✅
   - Consolidate duplicate utility functions ✅
   - Review and clean package.json dependencies ✅
7. Acceptance ✅: Inline text edits sync correctly across all clients with professional UX.

**BONUS ACHIEVEMENTS:**
- Figma-style text behavior (immediate edit on creation, auto-height expansion)
- Advanced text formatting (bold/italic/underline/strikethrough) with keyboard shortcuts
- Pixel-perfect text editor positioning using dynamic container detection
- Context-aware UI (text controls appear intelligently in toolbar)

---

## PR #11 — Transform System (Resize, Rotate, Aspect Lock) ✅
**Goal:** Implement resize handles, rotate, aspect lock, live preview and debounced sync.

### Tasks Completed ✅
1. **Konva.Transformer integration** ✅
   - Show transformer handles for selected shapes.
   - Live preview during transform operations.
   - Debounced sync writes during continuous transforms.
2. **Transform controls** ✅
   - Resize handles (8 directional).
   - Rotation handle.
   - Aspect lock toggle in toolbar with keyboard shortcut (Shift+A).
3. **Multi-shape transforms** ✅
   - Transform multiple selected shapes together.
   - Maintain relative positions and proportions.
4. **Unit Tests** ✅: Transform calculations, position stability, rotation precision, debouncing logic (27 comprehensive tests)
5. **Major Architecture Migration** ✅: Center-based coordinate system for intuitive rotation/scaling behavior
6. **Event System Separation** ✅: Clean pan/drag/transform conflict resolution with proper event bubbling control
7. **Hit Detection Improvements** ✅: Robust text shape selection with node tree walking algorithm
8. Acceptance ✅: Real-time transform preview with synced final state, stable positioning, accurate rotation.

**BONUS ACHIEVEMENTS:**
- Center-based coordinate system migration for intuitive transform behavior
- Comprehensive transform stability testing (prevents recurring position drift bugs)
- Advanced hit detection supporting nested Konva structures
- Professional event handling (pan only with space, clean transform/drag separation)

---

## PR #12 — Alignment Tools & Distribution
**Goal:** Add align and distribute tools for selected shapes.

### Tasks
1. **Alignment functions** (**USE KONVA BUILT-INS**)
   - Implement `alignShapes(shapeIds, alignment)` helper.
   - **⚠️ LEVERAGE NATIVE**: Use Konva's `node.getClientRect()` and `node.absolutePosition()` methods for precise bounds calculation and positioning.
   - Support: left, center, right, top, middle, bottom alignment.
   - Work with multi-selected shapes.
2. **Distribution functions** (**USE KONVA BUILT-INS**)
   - Implement `distributeShapes(shapeIds, direction)` helper.
   - **⚠️ LEVERAGE NATIVE**: Use Konva's positioning methods and bounds calculation for accurate distribution.
   - Support horizontal and vertical distribution.
3. **Toolbar integration**
   - Alignment button group in toolbar.
   - Distribution button group.
   - Enable/disable based on selection count.
4. **Unit Tests**: Alignment calculations, distribution algorithms
5. Acceptance: Alignment and distribution operations visible across all clients.

---

## PR #13 — Copy/Paste & Keyboard Shortcuts
**Goal:** Implement internal clipboard and comprehensive keyboard shortcuts.

### Tasks
1. **Clipboard system** (**CONSIDER NATIVE CLIPBOARD API**)
   - **⚠️ EVALUATE**: Consider using browser's native `navigator.clipboard.writeText()` and `navigator.clipboard.readText()` API for better user experience (requires HTTPS).
   - **FALLBACK**: Keep internal clipboard store slice as fallback for browsers without clipboard permissions.
   - Copy selected shapes to clipboard (JSON serialization).
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

## PR #14 — AI Integration: Foundation + Core Tool
**Goal:** Integrate OpenAI GPT-4o with basic infrastructure and 1 core tool.

### Tasks
1. **OpenAI integration** (**CONSIDER FIREBASE VERTEX AI**)
   - **⚠️ EVALUATE**: Consider using Firebase's new Vertex AI integration instead of direct OpenAI API for better Firebase ecosystem integration.
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
   - Support all shape types (rectangle, ellipse, text).
   - Route through normal sync pipeline.
6. **Testing**
   - **Unit Tests**: OpenAI wrapper, ToolRunner execution.
   - **Manual Tests**: "Create a red ellipse at 100, 200"
7. Acceptance: AI can successfully create shapes that sync to all clients.

---

## PR #15 — AI: Essential Tools Expansion  
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
   - **Manual Tests**: "Move the red ellipse to 300, 400" and "Delete all blue shapes"
5. Acceptance: AI can modify, delete, and reason about existing canvas content.

---

## PR #16 — AI: Layout & Composite Tools
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

## PR #17 — Collaborative Comments System
**Goal:** Add comment pins on canvas with threaded replies and real-time sync.

### Tasks
1. **Comment data structure** (**LEVERAGE FIRESTORE NATIVE FEATURES**)
   - Firestore `comments/{commentId}` collection.
   - **⚠️ LEVERAGE NATIVE**: Use Firestore's built-in `onSnapshot()` listeners for real-time updates instead of polling.
   - **⚠️ LEVERAGE NATIVE**: Use Firestore's `serverTimestamp()` for consistent ordering across clients.
   - Schema: `text, author, x, y, replies, resolved, createdAt`.
   - Optional `attachedToShape` field for shape-specific comments.
2. **Comment UI components**
   - Comment tool in toolbar.
   - Canvas comment pins with visual indicators.
   - Comment thread panel with replies.
   - Resolve/unresolve functionality.
3. **Real-time comment sync** (**ALREADY USING FIRESTORE OPTIMALLY**)
   - Comment creation and updates sync immediately via existing Firestore listeners.
   - Reply threads update in real-time.
   - Show/hide resolved comments toggle.
4. **Testing**
   - **Unit Tests**: Comment creation, reply threading.
   - **Manual Tests**: Multi-user comment conversations.
5. Acceptance: Threaded comments with real-time collaboration across all clients.

---

## PR #18 — Polish, Documentation & Deployment
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

### PR #19 — Performance Optimization (Flex Goal)
**Goal:** Scale to 500+ shapes while maintaining 60 FPS performance.
- Implement viewport-based shape culling
- Optimize re-renders with React.memo
- Add selective Zustand subscriptions
- Optional Web Worker integration for heavy operations

### PR #20 — Advanced Features (Flex Goal) 
**Goal:** Professional-grade features for power users.
- Multi-canvas support with routing
- Advanced keyboard shortcut customization  
- Export/import functionality (JSON, SVG)
- Advanced shape grouping and locking

### PR #21 — Auth & Security (Flex Goal)
**Goal:** Production-grade security and session management.
- Handle auth token expiry gracefully
- Implement Firestore security rules
- Add user session monitoring
- Basic usage analytics and monitoring

### PR #22 — Advanced UI/UX (Flex Goal)
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
- **Cleanup Sweep #2** (PR #13): Pre-AI integration - ensure clean foundation for AI features  
- **Cleanup Sweep #3** (PR #16): Post-AI integration - clean up AI development artifacts
- **Final Cleanup** (PR #18): Pre-deployment - production-ready code audit

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

