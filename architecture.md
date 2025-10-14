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
            end
            
            subgraph "State Management"
                Store[Zustand Store<br/>shapes, viewport, users,<br/>selectedIds, currentUser]
            end
            
            subgraph "Hooks"
                useAuth[useAuth<br/>Auth state listener]
                useSyncShapes[useSyncShapes<br/>Firestore shape sync]
                useCursorSync[useCursorSync<br/>Cursor position sync]
                usePresence[usePresence<br/>Online/offline status]
            end
            
            subgraph "Services"
                FirebaseService[firebase.js<br/>auth, db instances]
                FirestoreService[firestore.js<br/>Collection refs & helpers]
            end
        end
    end
    
    subgraph "Firebase Backend"
        subgraph "Firebase Auth"
            GoogleAuth[Google OAuth<br/>User authentication]
        end
        
        subgraph "Firestore Database"
            CanvasCollection[canvases/canvasId/]
            
            ShapesCollection[shapes/shapeId<br/>- id, type, x, y<br/>- width, height, fill<br/>- createdBy, updatedAt]
            
            UsersCollection[users/userId<br/>- uid, displayName<br/>- cursorX, cursorY<br/>- color, online, lastSeen]
            
            MetadataDoc[metadata<br/>- createdAt, createdBy<br/>- canvas settings]
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
    Toolbar --> Store
    OnlineUsers --> Store
    
    %% Shape Sync Flow
    Canvas --> useSyncShapes
    useSyncShapes --> Store
    useSyncShapes --> FirestoreService
    FirestoreService --> ShapesCollection
    ShapesCollection -.Real-time listener.-> useSyncShapes
    
    %% Cursor Sync Flow
    Canvas --> useCursorSync
    useCursorSync --> Store
    useCursorSync --> FirestoreService
    FirestoreService --> UsersCollection
    UsersCollection -.Real-time listener.-> useCursorSync
    
    %% Presence Flow
    App --> usePresence
    usePresence --> FirestoreService
    FirestoreService --> UsersCollection
    
    %% Firestore Structure
    CanvasCollection --> ShapesCollection
    CanvasCollection --> UsersCollection
    CanvasCollection --> MetadataDoc
    
    %% Multi-user connections
    User1 -.HTTP/WebSocket.-> FirebaseService
    User2 -.HTTP/WebSocket.-> FirebaseService
    UserN -.HTTP/WebSocket.-> FirebaseService
    
    %% Styling
    classDef componentStyle fill:#3b82f6,stroke:#1e40af,color:#fff
    classDef storeStyle fill:#8b5cf6,stroke:#6d28d9,color:#fff
    classDef hookStyle fill:#10b981,stroke:#059669,color:#fff
    classDef serviceStyle fill:#f59e0b,stroke:#d97706,color:#fff
    classDef firebaseStyle fill:#ef4444,stroke:#dc2626,color:#fff
    classDef userStyle fill:#6366f1,stroke:#4f46e5,color:#fff
    
    class Auth,Canvas,Shape,Cursor,Toolbar,OnlineUsers componentStyle
    class Store storeStyle
    class useAuth,useSyncShapes,useCursorSync,usePresence hookStyle
    class FirebaseService,FirestoreService serviceStyle
    class GoogleAuth,CanvasCollection,ShapesCollection,UsersCollection,MetadataDoc firebaseStyle
    class User1,User2,UserN userStyle