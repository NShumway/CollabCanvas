# CollabCanvas - Architecture Overview

Below is a full architectural representation of the CollabCanvas system, including frontend modules, backend Firebase services, AI integration, and data flows. This diagram reflects the current PRD and MVP foundation.

```mermaid
graph TB
    subgraph Client[Client Browser]
        subgraph ReactApp[React Application]
            App[App.tsx\nAuth Guard & Layout]
            subgraph Components[Components]
                Auth[Auth Components\nLoginButton, AuthGuard]
                Canvas[Canvas.tsx\nKonva Stage + Layers]
                Shape[Shape.tsx\nRect/Circle/Text rendering]
                Cursor[Cursor.tsx\nMultiplayer cursors]
                Toolbar[Toolbar.tsx\nCreate tools + shortcuts]
                OnlineUsers[OnlineUsers.tsx\nPresence list]
                ConnectionStatus[ConnectionStatus.tsx\nConnection indicator]
                ChatPanel[ChatPanel.tsx\nAI chat + message history]
                Comments[CommentsPanel.tsx\nPins + threads]
                LayerPanel[LayerPanel.tsx\nZ-index controls]
                ColorPicker[ColorPicker.tsx\nRecent/saved colors]
            end

            subgraph State[Zustand Store]
                Store[canvasStore.ts\nshapes, viewport, users,\nselectedIds, pendingWrites, connectionState, aiCommands, comments]
            end

            subgraph Hooks[Hooks - Read & Write Paths]
                useAuth[useAuth.ts\nAuth state listener]
                useFirestoreSync[useFirestoreSync.ts\nRead-only shape listener, echo prevention]
                useCursorSync[useCursorSync.ts\nCursor writes/listener]
                usePresence[usePresence.ts\nOnline/offline + heartbeat]
                useConnectionState[useConnectionState.ts\nReconnect reconciliation]
                useAI[useAI.ts\nSend AI commands + status updates]
            end

            subgraph Services[Services - Write Paths]
                SyncEngine[syncEngine.ts\napplyLocalChange, queueWrite, flushWrites (100ms debounce)]
                FirestoreService[firestore.ts\nCollection refs + helpers]
                FirebaseService[firebase.ts\nFirebase init, auth, db]
                OpenAIService[openai.ts\nFunction calling wrapper]
            end
        end
    end

    subgraph Firebase[Firebase Backend]
        subgraph Auth[Firebase Auth]
            GoogleAuth[Google OAuth\nUser Authentication]
        end

        subgraph DB[Firestore]
            CanvasCollection[canvases/{canvasId}]
            ShapesCollection[shapes/{shapeId}\n(id, type, x, y, width, height, fill, rotation?, fontSize?, text?, zIndex, updatedAt, updatedBy)]
            UsersCollection[users/{userId}\n(uid, displayName, cursorX, cursorY, color, online, lastSeen)]
            CommentsCollection[comments/{commentId}\n(text, author, x, y, replies, resolved, attachedToShape, createdAt)]
            MetadataDoc[metadata\n(createdAt, createdBy)]
        end
    end

    subgraph AI[AI Agent]
        GPT[OpenAI GPT-4o\nFunction calling]
        ToolRunner[ToolRunner.ts\nMaps AI calls to sync-safe tool execution]
    end

    %% Data & Control Flow
    App --> Canvas
    App --> Toolbar
    App --> ChatPanel
    App --> OnlineUsers
    App --> ConnectionStatus

    Canvas --> Shape
    Canvas --> Cursor
    Canvas --> Comments
    Canvas --> LayerPanel
    Canvas --> ColorPicker

    Store --> Canvas
    Store --> Shape
    Store --> Cursor
    Store --> Comments

    SyncEngine --> FirestoreService
    FirestoreService --> ShapesCollection
    FirestoreService --> UsersCollection
    FirestoreService --> CommentsCollection

    useFirestoreSync --> Store
    useCursorSync --> Store
    usePresence --> UsersCollection

    GPT --> OpenAIService
    OpenAIService --> ToolRunner
    ToolRunner --> SyncEngine

    %% Class styling
    classDef comp fill:#3b82f6,stroke:#1e40af,color:#fff
    classDef svc fill:#f59e0b,stroke:#d97706,color:#fff
    classDef store fill:#8b5cf6,stroke:#6d28d9,color:#fff
    classDef db fill:#ef4444,stroke:#dc2626,color:#fff

    class Auth,Canvas,Shape,Cursor,Toolbar,OnlineUsers,ConnectionStatus,ChatPanel,Comments,LayerPanel,ColorPicker comp
    class SyncEngine,FirestoreService,FirebaseService,OpenAIService,ToolRunner svc
    class Store store
    class ShapesCollection,UsersCollection,CommentsCollection,MetadataDoc db

    %% Notes
    Note1[CRITICAL: Write and Read paths MUST remain separate.\nSyncEngine: writes only; useFirestoreSync: read-only listener.]
    Note2[AI actions route through ToolRunner → SyncEngine to reuse normal sync pipeline.]
    Note3[Cursor sync: throttled writes (20Hz) separate from shapes.]

    Note1 -.-> SyncEngine
    Note2 -.-> ToolRunner
    Note3 -.-> useCursorSync
```

---

## Key Architectural Principles

1. **Local-First, Real-Time Sync** — All actions are first applied locally in Zustand, then synced to Firestore asynchronously for speed and reliability.
2. **Separated Read/Write Paths** — SyncEngine handles writes only, while listeners (hooks) manage reads. Prevents infinite loops and echo duplication.
3. **AI as a First-Class User** — AI-generated changes follow the same sync path as human edits, ensuring full determinism across clients.
4. **Component Isolation** — Shape, Cursor, Comments, and AI systems each operate in their own layer with distinct listeners and writes.
5. **Conflict Resolution** — Timestamp-based "last write wins" ensures deterministic updates without locking.
6. **Resilience** — Connection state tracking allows reconnection without data loss. Firestore ensures persistence.
7. **Performance Optimized** — Single store selector with shallow equality, Firestore docChanges() optimization, batched updates, refs for callback-only values.
8. **Event Handling Pattern** — Shapes handle clicks (selection), Konva Transformer handles drags (movement/resize/rotate), Canvas handles background (creation/box-select).

---

## Future Scalability

- **Virtualization & Worker Threads:** planned for heavy canvases (1000+ shapes).
- **IndexedDB caching:** optional offline-first enhancement.
- **Cloud Function hooks:** possible future backend validation or analytics.
- **AI Tool Expansion:** extending `ToolRunner` with new functions as new commands are added (e.g., layout, theme, auto-alignment).

---

