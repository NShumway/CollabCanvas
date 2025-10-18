/**
 * User Color Utility
 * 
 * Generates deterministic colors for users based on their UID.
 * Ensures consistent colors across presence, cursors, and UI components.
 */

import type { UserColor } from '@/types';

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
] as const;

/**
 * Generate a consistent color for a user based on their UID
 */
export const generateUserColor = (uid: string): UserColor => {
  if (!uid || typeof uid !== 'string') {
    return USER_COLORS[0]!; // Default fallback (non-null assertion is safe here)
  }
  
  // Create hash from uid for consistent color assignment
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use absolute value and modulo to get valid array index
  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index]!; // Non-null assertion is safe here
};

/**
 * Get all available user colors
 */
export const getAllUserColors = () => [...USER_COLORS] as const;
