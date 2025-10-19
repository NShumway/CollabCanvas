/**
 * Text Matching Utilities
 * 
 * Advanced text matching for AI shape selection, supporting fuzzy matching,
 * partial matches, and common variations.
 */

/**
 * Simple fuzzy matching score between 0 and 1
 * Uses Levenshtein distance for similarity scoring
 */
export const calculateTextSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Simple Levenshtein distance calculation
  const matrix: number[][] = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(0));
  
  for (let i = 0; i <= s1.length; i++) {
    matrix[0]![i] = i;
  }
  
  for (let j = 0; j <= s2.length; j++) {
    matrix[j]![0] = j;
  }
  
  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j]![i] = Math.min(
        matrix[j]![i - 1]! + 1,     // deletion
        matrix[j - 1]![i]! + 1,     // insertion
        matrix[j - 1]![i - 1]! + cost // substitution
      );
    }
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  const distance = matrix[s2.length]![s1.length]!;
  return (maxLength - distance) / maxLength;
};

/**
 * Enhanced text matching for AI shape selection
 * Supports partial matches, fuzzy matching, and common variations
 */
export const matchesText = (shapeText: string, searchText: string, threshold: number = 0.6): boolean => {
  if (!shapeText || !searchText) return false;
  
  const normalizedShapeText = shapeText.toLowerCase().trim();
  const normalizedSearchText = searchText.toLowerCase().trim();
  
  // Exact match (highest priority)
  if (normalizedShapeText === normalizedSearchText) {
    return true;
  }
  
  // Contains match (high priority)
  if (normalizedShapeText.includes(normalizedSearchText)) {
    return true;
  }
  
  // Reverse contains (for partial searches)
  if (normalizedSearchText.includes(normalizedShapeText)) {
    return true;
  }
  
  // Word-based matching (split by spaces and check if SIGNIFICANT search words are present)
  const searchWords = normalizedSearchText.split(/\s+/).filter(word => word.length > 2); // Only words longer than 2 chars
  const shapeWords = normalizedShapeText.split(/\s+/).filter(word => word.length > 2);
  
  if (searchWords.length > 0) {
    const matchedWords = searchWords.filter(searchWord => 
      shapeWords.some(shapeWord => {
        // Exact match (highest priority)
        if (searchWord === shapeWord) {
          return true;
        }
        
        // For short words, only allow exact matches to prevent false positives
        if (searchWord.length <= 4 || shapeWord.length <= 4) {
          return false; // No fuzzy matching for short words
        }
        
        // Only allow contains if it's a meaningful prefix/suffix, not random substring
        const shapeContainsSearch = shapeWord.includes(searchWord);
        const searchContainsShape = searchWord.includes(shapeWord);
        
        // Be very careful with reverse contains - avoid false positives like "text" in "nonexistenttext"
        if (searchContainsShape) {
          // Only match if the shape word is a meaningful part (at start/end) of search word
          const isPrefix = searchWord.startsWith(shapeWord);
          const isSuffix = searchWord.endsWith(shapeWord);
          if (!(isPrefix || isSuffix)) {
            return false; // Don't match random substrings
          }
        }
        
        // Standard contains matching (shape contains search) is safer
        if (shapeContainsSearch) {
          return true;
        }
        
        // High-threshold fuzzy matching for legitimate typos only
        const similarity = calculateTextSimilarity(shapeWord, searchWord);
        return similarity >= 0.9; // Very high threshold for word-level fuzzy matching
      })
    );
    
    // Require ALL or most search words to match for word-based matching
    if (matchedWords.length >= Math.ceil(searchWords.length * 0.95)) {
      return true;
    }
  }
  
  // Fuzzy similarity match (VERY STRICT - lowest priority, for typos only)
  // 🚨 SAFETY: Only use fuzzy matching for very high similarity to prevent false positives
  const similarity = calculateTextSimilarity(normalizedShapeText, normalizedSearchText);
  
  // For short texts, require extremely high similarity
  if (normalizedShapeText.length <= 10 || normalizedSearchText.length <= 10) {
    return similarity >= 0.95; // 95% similarity required for short texts
  }
  
  // For longer texts, still require high similarity but allow for legitimate typos
  return similarity >= Math.max(threshold, 0.85); // Minimum 85% similarity regardless of threshold
};

/**
 * Find the best text matches from a collection of texts
 * Returns matches sorted by relevance score
 */
export const findBestTextMatches = (
  texts: { id: string; text: string }[], 
  searchText: string, 
  maxResults: number = 10
): { id: string; text: string; score: number }[] => {
  if (!searchText) return [];
  
  const scoredMatches = texts
    .map(item => ({
      ...item,
      score: calculateTextSimilarity(item.text, searchText)
    }))
    .filter(item => item.score >= 0.3) // Minimum threshold
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, maxResults);
  
  return scoredMatches;
};

/**
 * Extract key terms from text for better matching
 * Removes common stop words and focuses on meaningful terms
 */
export const extractKeyTerms = (text: string): string[] => {
  if (!text) return [];
  
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their'
  ]);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10); // Limit to 10 key terms
};
