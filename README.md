# CollabCanvas

Real-time collaborative design tool with multiplayer canvas editing and AI-powered design assistance.

## Project Status

✅ **PR #1: Project Setup & Initial Deployment** - 95% Complete
- React + Vite project initialized
- All dependencies installed (React-Konva, Zustand, Firebase, Anthropic SDK, Tailwind)
- Firebase project configured
- Environment variables set up
- Folder structure created
- Firebase service initialized
- Hello World app ready

⏳ **Next Steps:**
- Complete deployment (npm build + hosting)
- PR #2: Authentication & Zustand store
- PR #3: Basic canvas with pan/zoom

## Development Setup

1. **Prerequisites:**
   - Node.js 18+ and npm
   - Firebase project (already configured)

2. **Installation:**
   ```bash
   npm install
   ```

3. **Environment:**
   - Firebase config in `env.local` (already set up)

4. **Development:**
   ```bash
   npm run dev
   ```

5. **Build:**
   ```bash
   npm run build
   ```

## Architecture

### Tech Stack
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Canvas:** React-Konva for high-performance rendering
- **State:** Zustand for lightweight state management
- **Backend:** Firebase (Firestore + Auth)
- **AI:** Anthropic Claude Sonnet 4
- **Deployment:** Firebase Hosting or Vercel

### Folder Structure
```
src/
├── components/
│   ├── Auth/          # Authentication components
│   ├── Canvas/        # Canvas and shape components
│   └── UI/            # UI components (toolbar, panels)
├── store/             # Zustand stores
├── services/          # Firebase and external services
├── hooks/             # Custom React hooks
└── utils/             # Utility functions
```

### MVP Features (24-hour gate)
- Google OAuth authentication
- Real-time multiplayer cursors
- Canvas with pan/zoom
- Rectangle creation and dragging
- Real-time shape synchronization
- Persistence across sessions

## Firebase Configuration

Project: canvascollab-ba367
- Firestore: Enabled (test mode)
- Authentication: Google provider enabled
- Hosting: Ready for deployment

## Deployment

**Manual Steps Required:**
1. Ensure Node.js/npm is in system PATH
2. Run `npm run build`
3. Deploy to Firebase Hosting or Vercel
4. Update this README with live URL

---

Built for the 7-day CollabCanvas sprint challenge.