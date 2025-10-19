/**
 * AI System Constants
 * 
 * Centralized configuration for AI behavior, safety limits, and thresholds.
 * All magic numbers should be defined here with clear documentation.
 */

// === SAFETY LIMITS ===
export const AI_SAFETY = {
  MAX_SELECTION_COUNT: 10,
  TEXT_SEARCH_MIN_THRESHOLD: 0.7,
  MASS_SELECTION_WARNING_THRESHOLD: 5,
  RATE_LIMIT_DEFAULT: 50,
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
} as const;

// === TEXT MATCHING THRESHOLDS ===
export const TEXT_MATCHING = {
  // Similarity scores (0-1)
  EXACT_MATCH_SCORE: 1.0,
  CONTAINS_MATCH_SCORE: 0.8,
  
  // Fuzzy matching thresholds
  FUZZY_STRICT_THRESHOLD: 0.95,    // For short text
  FUZZY_NORMAL_THRESHOLD: 0.85,    // For longer text
  FUZZY_WORD_THRESHOLD: 0.9,       // For individual words
  FUZZY_MINIMUM_THRESHOLD: 0.3,    // Absolute minimum
  
  // Word filtering
  MIN_WORD_LENGTH: 3,              // Only consider words longer than this
  SHORT_WORD_MAX_LENGTH: 4,        // Require exact match for words this short or shorter
  WORD_MATCH_PERCENTAGE: 0.95,     // % of search words that must match
  
  // Text length thresholds
  SHORT_TEXT_MAX_LENGTH: 10,       // Text shorter than this requires strict matching
  MAX_KEY_TERMS: 10,               // Maximum key terms to extract
} as const;

// === CANVAS DEFAULTS ===
export const CANVAS_DEFAULTS = {
  VIEWPORT_WIDTH: 1000,
  VIEWPORT_HEIGHT: 1000,
  SHAPE_DEFAULT_SIZE: 100,
  POSITION_OFFSET: 50,             // Offset from edges for "top left" etc.
  SHAPE_SIZE_OFFSET: 150,          // Size consideration for positioning
  HEADER_HEIGHT: 100,              // Approximate header + toolbar height
  SIDEBAR_WIDTH: 256,              // Left sidebar width (w-64)
  AI_PANEL_WIDTH: 320,             // AI panel width (w-80)
} as const;

// === COLOR MAPPINGS ===
export const COLOR_NAMES = {
  'red': '#ff0000',
  'blue': '#0000ff', 
  'green': '#00ff00',
  'yellow': '#ffff00',
  'purple': '#800080',
  'orange': '#ffa500',
  'pink': '#ffc0cb',
  'black': '#000000',
  'white': '#ffffff',
  'gray': '#808080',
  'grey': '#808080'
} as const;

// === STOP WORDS FOR TEXT PROCESSING ===
export const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their'
]);

// === POSITION KEYWORDS ===
export const POSITION_KEYWORDS = {
  RECENT: ['recent', 'last', 'newest', 'latest'],
  ALL: ['all', 'every', 'everything']
} as const;

// === ERROR MESSAGES ===
export const AI_ERROR_MESSAGES = {
  SELECTION_TOO_BROAD: (count: number, max: number) => 
    `Found ${count} shapes matching criteria. This seems too many - please be more specific to avoid accidental mass changes. Maximum safe selection is ${max} shapes.`,
  
  NO_TEXT_MATCHES: (searchText: string) => 
    `No text shapes found containing "${searchText}". Try using key words or partial phrases from the text.`,
    
  VAGUE_CRITERIA: (count: number, criteria: string, value: string) => 
    `Found ${count} shapes matching "${criteria}: ${value}". Please be more specific (add text content, position, or other criteria).`,
    
  AI_NOT_CONFIGURED: 'AI service is not configured. Please check your OpenAI API key.',
  
  TOOL_SYSTEM_UNAVAILABLE: 'AI tool system is not available. Please refresh the page.',
  
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please wait before sending another message.',
  
  GENERIC_FAILURE: 'Failed to process AI request. Please try again.'
} as const;

// === TYPE GUARDS AND VALIDATORS ===
export const isValidColor = (color: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(color) || color.toLowerCase() in COLOR_NAMES;
};

export const normalizeColor = (color: string): string => {
  const normalized = color.toLowerCase();
  return COLOR_NAMES[normalized as keyof typeof COLOR_NAMES] || color;
};

export const isRecentPositionKeyword = (position: string): boolean => {
  return POSITION_KEYWORDS.RECENT.includes(position.toLowerCase() as any);
};
