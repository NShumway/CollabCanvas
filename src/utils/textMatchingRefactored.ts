/**
 * Refactored Text Matching Utilities
 * 
 * Clean, type-safe, and maintainable text matching for AI shape selection.
 * Eliminates magic numbers, reduces complexity, and improves performance.
 */

import { TEXT_MATCHING, STOP_WORDS } from './aiConstants';
import type { TextMatchOptions, SimilarityResult, TextProcessingResult } from '../types/aiTypes';

// === TEXT NORMALIZATION ===
const normalizeText = (text: string): string => {
  if (!text) return '';
  return text.toLowerCase().trim();
};

const isShortText = (text: string): boolean => {
  return text.length <= TEXT_MATCHING.SHORT_TEXT_MAX_LENGTH;
};

// === SIMILARITY CALCULATION ===
export const calculateTextSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  // Fast exact match
  if (s1 === s2) return TEXT_MATCHING.EXACT_MATCH_SCORE;
  
  // Fast contains match
  if (s1.includes(s2) || s2.includes(s1)) {
    return TEXT_MATCHING.CONTAINS_MATCH_SCORE;
  }
  
  // Levenshtein distance for fuzzy matching
  return calculateLevenshteinSimilarity(s1, s2);
};

const calculateLevenshteinSimilarity = (s1: string, s2: string): number => {
  const matrix: number[][] = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= s1.length; i++) matrix[0]![i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j]![0] = j;
  
  // Fill the matrix
  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j]![i] = Math.min(
        matrix[j]![i - 1]! + 1,         // deletion
        matrix[j - 1]![i]! + 1,         // insertion
        matrix[j - 1]![i - 1]! + cost   // substitution
      );
    }
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  const distance = matrix[s2.length]![s1.length]!;
  return (maxLength - distance) / maxLength;
};

// === EXACT MATCHING STRATEGIES ===
const exactMatch = (shapeText: string, searchText: string): boolean => {
  return normalizeText(shapeText) === normalizeText(searchText);
};

const containsMatch = (shapeText: string, searchText: string): boolean => {
  const normalizedShape = normalizeText(shapeText);
  const normalizedSearch = normalizeText(searchText);
  
  return normalizedShape.includes(normalizedSearch) || 
         normalizedSearch.includes(normalizedShape);
};

// === WORD-BASED MATCHING ===
const extractSignificantWords = (text: string): string[] => {
  return normalizeText(text)
    .split(/\s+/)
    .filter(word => word.length > TEXT_MATCHING.MIN_WORD_LENGTH);
};

const isValidWordMatch = (shapeWord: string, searchWord: string): boolean => {
  // Exact match always valid
  if (shapeWord === searchWord) return true;
  
  // Short words must match exactly
  if (shapeWord.length <= TEXT_MATCHING.SHORT_WORD_MAX_LENGTH || 
      searchWord.length <= TEXT_MATCHING.SHORT_WORD_MAX_LENGTH) {
    return false;
  }
  
  // Check contains relationships carefully
  if (shapeWord.includes(searchWord)) return true;
  
  // For reverse contains, only allow meaningful prefix/suffix matches
  if (searchWord.includes(shapeWord)) {
    return searchWord.startsWith(shapeWord) || searchWord.endsWith(shapeWord);
  }
  
  // High-threshold fuzzy matching for typos
  const similarity = calculateLevenshteinSimilarity(shapeWord, searchWord);
  return similarity >= TEXT_MATCHING.FUZZY_WORD_THRESHOLD;
};

const wordBasedMatch = (shapeText: string, searchText: string): boolean => {
  const shapeWords = extractSignificantWords(shapeText);
  const searchWords = extractSignificantWords(searchText);
  
  if (searchWords.length === 0) return false;
  
  const matchedWords = searchWords.filter(searchWord =>
    shapeWords.some(shapeWord => isValidWordMatch(shapeWord, searchWord))
  );
  
  const requiredMatches = Math.ceil(searchWords.length * TEXT_MATCHING.WORD_MATCH_PERCENTAGE);
  return matchedWords.length >= requiredMatches;
};

// === FUZZY MATCHING ===
const fuzzyMatch = (shapeText: string, searchText: string, threshold: number): boolean => {
  const similarity = calculateTextSimilarity(shapeText, searchText);
  
  // Use strict thresholds for short text
  if (isShortText(shapeText) || isShortText(searchText)) {
    return similarity >= TEXT_MATCHING.FUZZY_STRICT_THRESHOLD;
  }
  
  // Use normal threshold for longer text, but enforce minimum
  const effectiveThreshold = Math.max(threshold, TEXT_MATCHING.FUZZY_NORMAL_THRESHOLD);
  return similarity >= effectiveThreshold;
};

// === MAIN MATCHING FUNCTION ===
export const matchesText = (
  shapeText: string, 
  searchText: string, 
  options: TextMatchOptions = {}
): boolean => {
  if (!shapeText || !searchText) return false;
  
  const { threshold = 0.6, strictMode = false, allowFuzzy = true } = options;
  
  // Strategy 1: Exact match (highest priority)
  if (exactMatch(shapeText, searchText)) return true;
  
  // Strategy 2: Contains match (high priority)  
  if (containsMatch(shapeText, searchText)) return true;
  
  // Strategy 3: Word-based matching (medium priority)
  if (wordBasedMatch(shapeText, searchText)) return true;
  
  // Strategy 4: Fuzzy matching (lowest priority, only if allowed)
  if (allowFuzzy && !strictMode) {
    return fuzzyMatch(shapeText, searchText, threshold);
  }
  
  return false;
};

// === ADVANCED MATCHING FUNCTIONS ===
export const findBestTextMatches = (
  texts: { id: string; text: string }[], 
  searchText: string, 
  maxResults: number = 10
): Array<{ id: string; text: string; score: number }> => {
  if (!searchText || texts.length === 0) return [];
  
  return texts
    .map(item => ({
      ...item,
      score: calculateTextSimilarity(item.text, searchText)
    }))
    .filter(item => item.score >= TEXT_MATCHING.FUZZY_MINIMUM_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
};

export const extractKeyTerms = (text: string): string[] => {
  if (!text) return [];
  
  return normalizeText(text)
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > TEXT_MATCHING.MIN_WORD_LENGTH && !STOP_WORDS.has(word))
    .slice(0, TEXT_MATCHING.MAX_KEY_TERMS);
};

// === ANALYSIS FUNCTIONS ===
export const analyzeTextMatch = (
  shapeText: string, 
  searchText: string
): SimilarityResult => {
  if (!shapeText || !searchText) {
    return { score: 0, matchType: 'exact', confidence: 'low' };
  }
  
  const similarity = calculateTextSimilarity(shapeText, searchText);
  
  let matchType: SimilarityResult['matchType'];
  let confidence: SimilarityResult['confidence'];
  
  if (exactMatch(shapeText, searchText)) {
    matchType = 'exact';
    confidence = 'high';
  } else if (containsMatch(shapeText, searchText)) {
    matchType = 'contains';
    confidence = 'high';
  } else if (wordBasedMatch(shapeText, searchText)) {
    matchType = 'word-based';
    confidence = 'medium';
  } else {
    matchType = 'fuzzy';
    confidence = similarity > 0.8 ? 'medium' : 'low';
  }
  
  return { score: similarity, matchType, confidence };
};

export const processText = (text: string): TextProcessingResult => {
  const normalizedText = normalizeText(text);
  const keyTerms = extractKeyTerms(text);
  const wordCount = normalizedText.split(/\s+/).filter(Boolean).length;
  const shortText = isShortText(normalizedText);
  
  return {
    normalizedText,
    keyTerms,
    wordCount,
    isShortText: shortText
  };
};
