graph TB
    subgraph "Client Browser"
        subgraph "React Application"
            App[App.jsx<br/>Auth Guard & Layout]
            
            subgraph "Components"
                Auth[Auth Components<br/>LoginButton, AuthGuard]
                Canvas[Canvas.jsx<br/>Konva Stage + Layers]
                Shape[Shape.jsx<br/>Rectangle rendering]
                Cursor[Cursor.jsx<br/>Multiplayer cursors]
                Toolbar[Toolbar.jsx<br/>Create tools]
                OnlineUsers[OnlineUsers.jsx<br/>Presence list]
                ConnectionStatus[ConnectionStatus.jsx<br/>Connection indicator]
            end
            
            subgraph "State Management"
                Store[Zustand Store<br/>shapes, viewport, users,<br/>selectedIds, currentUser<br/>pendingWrites, connectionState]
            end
            
            subgraph "Hooks - Read Paths"
                useAuth[useAuth<br/>Auth state listener]
                useFirestoreSync[useFirestoreSync<br/>Shape listener ONLY<br/>Echo prevention<br/>Timestamp comparison]
                useCursorSync[useCursorSync<br/>Cursor listener ONLY<br/>Separate from shapes]
                usePresence[usePresence<br/>Online/offline status]
                useConnectionState[useConnectionState<br/>Network monitoring<br/>State reconciliation]
            end
            
            subgraph "Services - Write Paths"
                SyncEngine[SyncEngine<br/>applyLocalChange<br/>queueWrite<br/>flushWrites<br/>NO listeners here]
                FirebaseService[firebase.js<br/>auth, db instances]
                FirestoreService[firestore.js<br/>Collection refs]
            end
        end
    end
    
    subgraph "Firebase Backend"
        subgraph "Firebase Auth"
            GoogleAuth[Google OAuth<br/>User authentication]
        end
        
        subgraph "Firestore Database"
            CanvasCollection[canvases/canvasId/]
            
            ShapesCollection[shapes/shapeId<br/>- id, type, x, y<br/>- width, height, fill<br/>- updatedAt server timestamp<br/>- clientTimestamp<br/>- updatedBy uid]
            
            UsersCollection[users/userId<br/>- uid, displayName<br/>- cursorX, cursorY<br/>- color, online, lastSeen]
            
            MetadataDoc[metadata<br/>- createdAt, createdBy]
        end
    end
    
    subgraph "User Interactions"
        User1[User 1 Browser]
        User2[User 2 Browser]
        UserN[User N Browser]
    end
    
    %% Auth Flow
    App --> Auth
    Auth --> useAuth
    useAuth --> FirebaseService
    FirebaseService --> GoogleAuth
    GoogleAuth --> Store
    
    %% Canvas Rendering
    App --> Canvas
    Canvas --> Shape
    Canvas --> Cursor
    Store --> Canvas
    Store --> Shape
    Store --> Cursor
    
    %% UI Components
    App --> Toolbar
    App --> OnlineUsers
    App --> ConnectionStatus
    Toolbar --> Store
    OnlineUsers --> Store
    ConnectionStatus --> Store
    
    %% WRITE PATH - One Way Only
    Canvas -- User Action --> SyncEngine
    SyncEngine -- 1 Update Local --> Store
    SyncEngine -- 2 Mark Pending --> Store
    SyncEngine -- 3 Queue Write --> FirestoreService
    FirestoreService -- 4 Batch Commit --> ShapesCollection
    
    %% READ PATH - Separate from Write
    ShapesCollection -.5 Real-time listener.-> useFirestoreSync
    useFirestoreSync -- 6 Check hasPendingWrites --> useFirestoreSync
    useFirestoreSync -- 7 Check timestamp --> useFirestoreSync
    useFirestoreSync -- 8 Update if newer --> Store
    
    %% Cursor Sync - Separate Fast Path
    Canvas -- Mouse Move --> useCursorSync
    useCursorSync -- Throttled Write --> UsersCollection
    UsersCollection -.Real-time listener.-> useCursorSync
    useCursorSync --> Store
    
    %% Presence Flow - Separate
    App --> usePresence
    usePresence --> UsersCollection
    
    %% Connection State
    App --> useConnectionState
    useConnectionState --> Store
    useConnectionState -- Reconcile on reconnect --> ShapesCollection
    
    %% Firestore Structure
    CanvasCollection --> ShapesCollection
    CanvasCollection --> UsersCollection
    CanvasCollection --> MetadataDoc
    
    %% Multi-user connections
    User1 -.HTTP/WebSocket.-> FirebaseService
    User2 -.HTTP/WebSocket.-> FirebaseService
    UserN -.HTTP/WebSocket.-> FirebaseService
    
    %% Key Architecture Notes
    Note1[CRITICAL: Write and Read paths<br/>are SEPARATE - never cross]
    Note2[SyncEngine: Write path ONLY<br/>NO listeners in this file]
    Note3[useFirestoreSync: Read path ONLY<br/>Echo prevention + timestamp check]
    Note4[Cursor sync completely separate<br/>from shape sync]
    
    %% Styling
    classDef componentStyle fill:#3b82f6,stroke:#1e40af,color:#fff
    classDef storeStyle fill:#8b5cf6,stroke:#6d28d9,color:#fff
    classDef hookStyle fill:#10b981,stroke:#059669,color:#fff
    classDef serviceStyle fill:#f59e0b,stroke:#d97706,color:#fff
    classDef firebaseStyle fill:#ef4444,stroke:#dc2626,color:#fff
    classDef userStyle fill:#6366f1,stroke:#4f46e5,color:#fff
    classDef noteStyle fill:#fbbf24,stroke:#f59e0b,color:#000
    
    class Auth,Canvas,Shape,Cursor,Toolbar,OnlineUsers,ConnectionStatus componentStyle
    class Store storeStyle
    class useAuth,useFirestoreSync,useCursorSync,usePresence,useConnectionState hookStyle
    class SyncEngine,FirebaseService,FirestoreService serviceStyle
    class GoogleAuth,CanvasCollection,ShapesCollection,UsersCollection,MetadataDoc firebaseStyle
    class User1,User2,UserN userStyle
    class Note1,Note2,Note3,Note4 noteStyle