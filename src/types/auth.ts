/**
 * Authentication and User Type Definitions
 * 
 * Type safety for Firebase Auth integration and user management.
 */

// Current authenticated user data
export interface CurrentUser {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
}

// Multiplayer user data (includes cursor position and presence)
export interface MultiplayerUser {
  readonly uid: string;
  readonly displayName: string;
  cursorX: number;
  cursorY: number;
  color: string;
  online: boolean;
  lastSeen: number;
}

// User collection for multiplayer state
export type UserCollection = Record<string, MultiplayerUser>;

// Authentication state
export interface AuthState {
  currentUser: CurrentUser | null;
  loading: boolean;
  isAuthenticated: boolean;
}

// Auth hook return type
export interface UseAuthReturn extends AuthState {
  // Additional methods could be added here in the future
}

// Firebase user conversion helper
export const createCurrentUser = (firebaseUser: {
  uid: string;
  email: string | null;
}): CurrentUser => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email ?? '',
  displayName: firebaseUser.email ? firebaseUser.email.split('@')[0] ?? 'Unknown User' : 'Unknown User',
});

// User color assignment (from userColor.ts utility)
export const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
] as const;

export type UserColor = typeof USER_COLORS[number];

// Type guard for user validation
export const isValidUser = (obj: unknown): obj is CurrentUser => {
  if (!obj || typeof obj !== 'object') return false;
  const user = obj as Record<string, unknown>;
  
  return (
    typeof user['uid'] === 'string' &&
    typeof user['email'] === 'string' &&
    typeof user['displayName'] === 'string'
  );
};

// Cursor position type
export interface CursorPosition {
  x: number;
  y: number;
}

// Connection states
export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

// Presence update data
export interface PresenceUpdate {
  cursorX: number;
  cursorY: number;
  online: boolean;
  lastSeen: number;
}
