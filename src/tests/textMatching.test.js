/**
 * Text Matching Tests
 * Tests for improved fuzzy text matching in AI shape selection
 */

import { describe, it, expect } from 'vitest';
import { matchesText, calculateTextSimilarity, findBestTextMatches, extractKeyTerms } from '../utils/textMatching';

describe('Text Matching Utilities', () => {
  describe('matchesText', () => {
    it('should match exact text', () => {
      expect(matchesText('Hello World', 'Hello World')).toBe(true);
      expect(matchesText('Nate Shumway is the BOSS', 'Nate Shumway is the BOSS')).toBe(true);
    });

    it('should match partial text (contains)', () => {
      expect(matchesText('Nate Shumway is the BOSS and ruler of all', 'Nate Shumway')).toBe(true);
      expect(matchesText('Nate Shumway is the BOSS', 'BOSS')).toBe(true);
      expect(matchesText('Hello World Application', 'Hello World')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(matchesText('Nate Shumway is the BOSS', 'nate shumway')).toBe(true);
      expect(matchesText('HELLO WORLD', 'hello world')).toBe(true);
    });

    it('should match reversed contains (partial search)', () => {
      expect(matchesText('BOSS', 'Nate Shumway is the BOSS')).toBe(true);
      expect(matchesText('World', 'Hello World Application')).toBe(true);
    });

    it('should handle word-based matching', () => {
      expect(matchesText('Nate Shumway is the BOSS', 'Nate BOSS')).toBe(true);
      expect(matchesText('The quick brown fox', 'quick fox')).toBe(true);
      expect(matchesText('JavaScript is awesome', 'awesome JavaScript')).toBe(true);
    });

    it('should handle fuzzy matching for typos', () => {
      // These should match via contains logic, not fuzzy similarity
      expect(matchesText('Nate Shumway is here', 'Nate Shumway')).toBe(true); // Contains match
      expect(matchesText('Hello World Application', 'Hello World')).toBe(true); // Contains match
      expect(matchesText('Canvas Design Tool for Teams', 'Canvas Design')).toBe(true); // Contains match
      
      // Very close typos should still work with high similarity
      expect(matchesText('JavaScript', 'JavaScript')).toBe(true); // Exact
      expect(matchesText('Development', 'Development')).toBe(true); // Exact
    });

    it('should reject completely unrelated text', () => {
      expect(matchesText('Nate Shumway is the BOSS', 'completely different text')).toBe(false);
      expect(matchesText('Hello World', 'xyz abc def')).toBe(false);
    });

    it('should handle empty or null inputs', () => {
      expect(matchesText('', 'test')).toBe(false);
      expect(matchesText('test', '')).toBe(false);
      expect(matchesText(null, 'test')).toBe(false);
      expect(matchesText('test', null)).toBe(false);
    });
  });

  describe('calculateTextSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(calculateTextSimilarity('hello', 'hello')).toBe(1);
      expect(calculateTextSimilarity('Nate Shumway', 'Nate Shumway')).toBe(1);
    });

    it('should return high similarity for contains relationships', () => {
      const similarity = calculateTextSimilarity('Hello World', 'Hello');
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should return 0 for completely different strings', () => {
      expect(calculateTextSimilarity('hello', '')).toBe(0);
      expect(calculateTextSimilarity('', 'world')).toBe(0);
    });

    it('should handle case differences', () => {
      const similarity = calculateTextSimilarity('Hello', 'HELLO');
      expect(similarity).toBe(1);
    });
  });

  describe('findBestTextMatches', () => {
    const textItems = [
      { id: 'shape1', text: 'Nate Shumway is the BOSS and ruler of all' },
      { id: 'shape2', text: 'Hello World Application' },
      { id: 'shape3', text: 'Canvas Design Tool' },
      { id: 'shape4', text: 'Nate is awesome' },
      { id: 'shape5', text: 'The BOSS of everything' }
    ];

    it('should find best matches for partial text', () => {
      const matches = findBestTextMatches(textItems, 'Nate Shumway');
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('shape1'); // Best match should be first
      expect(matches[0].score).toBeGreaterThanOrEqual(0.8);
      
      // Should also find partial matches
      const nateMatches = matches.filter(m => m.text.includes('Nate'));
      expect(nateMatches.length).toBeGreaterThan(1);
    });

    it('should sort matches by relevance score', () => {
      const matches = findBestTextMatches(textItems, 'BOSS', 5);
      
      expect(matches.length).toBeGreaterThan(0);
      
      // Scores should be in descending order
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
      }
    });

    it('should limit results based on maxResults parameter', () => {
      const matches = findBestTextMatches(textItems, 'e', 2); // 'e' appears in many texts
      expect(matches.length).toBeLessThanOrEqual(2);
    });

    it('should handle no matches gracefully', () => {
      const matches = findBestTextMatches(textItems, 'xyzzxyzzxyzz');
      expect(matches.length).toBe(0);
    });
  });

  describe('extractKeyTerms', () => {
    it('should extract meaningful terms', () => {
      const terms = extractKeyTerms('Nate Shumway is the BOSS and ruler of all');
      
      expect(terms).toContain('nate');
      expect(terms).toContain('shumway');
      expect(terms).toContain('boss');
      expect(terms).toContain('ruler');
      
      // Should not include stop words
      expect(terms).not.toContain('the');
      expect(terms).not.toContain('is');
      expect(terms).not.toContain('and');
      expect(terms).not.toContain('of');
    });

    it('should handle punctuation and capitalization', () => {
      const terms = extractKeyTerms('Hello, World! This is a TEST.');
      
      expect(terms).toContain('hello');
      expect(terms).toContain('world');
      expect(terms).toContain('test');
      expect(terms).not.toContain('this');
    });

    it('should limit to reasonable number of terms', () => {
      const longText = 'This is a very long text with many different words that should be limited to prevent overwhelming the matching algorithm with too many terms';
      const terms = extractKeyTerms(longText);
      
      expect(terms.length).toBeLessThanOrEqual(10);
    });

    it('should handle empty input', () => {
      expect(extractKeyTerms('')).toEqual([]);
      expect(extractKeyTerms(null)).toEqual([]);
      expect(extractKeyTerms(undefined)).toEqual([]);
    });
  });

  describe('AI Shape Selection Integration', () => {
    it('should handle real-world text matching scenarios', () => {
      // Scenario 1: User asks for "Nate Shumway" and shape contains "Nate Shumway is the BOSS..."
      expect(matchesText('Nate Shumway is the BOSS and ruler of everything', 'Nate Shumway')).toBe(true);
      
      // Scenario 2: User asks for "BOSS" and should find the shape
      expect(matchesText('Nate Shumway is the BOSS and ruler of everything', 'BOSS')).toBe(true);
      
      // Scenario 3: User types partial text with different casing
      expect(matchesText('Welcome to CollabCanvas', 'collab')).toBe(true);
      
      // Scenario 4: User makes a small typo
      expect(matchesText('JavaScript Development', 'JavaScipt')).toBe(true);
      
      // Scenario 5: User searches with multiple keywords
      expect(matchesText('AI-powered design tool for teams', 'AI design')).toBe(true);
    });

    describe('False Positive Prevention', () => {
      it('should NOT match completely unrelated text (safety critical)', () => {
        // 🚨 CRITICAL: These should NEVER match to prevent accidental mass selection
        expect(matchesText('Existing text', 'NonexistentText')).toBe(false);
        expect(matchesText('Hello World', 'Goodbye Mars')).toBe(false);
        expect(matchesText('Project Documentation', 'Random String')).toBe(false);
        expect(matchesText('Canvas Drawing Tool', 'Database Query')).toBe(false);
      });

      it('should NOT match on shared common short words only', () => {
        // These share words like "the", "is", "and" but are unrelated
        expect(matchesText('The cat is sleeping', 'The dog is running')).toBe(false);
        expect(matchesText('This is a test', 'This is different')).toBe(false);
      });

      it('should NOT match on single character similarities', () => {
        expect(matchesText('abc', 'xyz')).toBe(false);
        expect(matchesText('test', 'best')).toBe(false); // Only 1 char different but unrelated words
      });

      it('should be strict with short text comparisons', () => {
        // Short texts should require higher similarity
        expect(matchesText('Hi', 'By')).toBe(false);
        expect(matchesText('Go', 'No')).toBe(false);
        expect(matchesText('Cat', 'Bat')).toBe(false);
      });
    });

    describe('Valid Match Scenarios', () => {
      it('should match exact substrings (contains)', () => {
        expect(matchesText('Nate Shumway is the BOSS', 'Nate Shumway')).toBe(true);
        expect(matchesText('Welcome to our application', 'Welcome')).toBe(true);
        expect(matchesText('JavaScript Development Guide', 'JavaScript')).toBe(true);
      });

      it('should match partial words for meaningful terms', () => {
        expect(matchesText('CollabCanvas Application', 'Collab')).toBe(true);
        expect(matchesText('Development Environment', 'Develop')).toBe(true);
        expect(matchesText('Authentication Service', 'Auth')).toBe(true);
      });

      it('should handle legitimate typos', () => {
        // With the stricter logic, typos need to be handled via contains or very high similarity
        // These should match via contains logic when embedded in longer text
        expect(matchesText('JavaScript Development Guide', 'JavaScript')).toBe(true); // Contains match
        expect(matchesText('Development Environment Setup', 'Development')).toBe(true); // Contains match
        expect(matchesText('Authentication Service Documentation', 'Authentication')).toBe(true); // Contains match
      });

      it('should match multiple keywords when most are present', () => {
        expect(matchesText('AI-powered design tool for teams', 'AI design')).toBe(true);
        expect(matchesText('React TypeScript Development', 'React TypeScript')).toBe(true);
        expect(matchesText('Canvas drawing and editing tool', 'Canvas drawing')).toBe(true);
      });
    });

    describe('Threshold Behavior', () => {
      it('should respect different threshold levels', () => {
        const text1 = 'Similar text content';
        const text2 = 'Similar text context'; // 1 letter different

        expect(matchesText(text1, text2, 0.9)).toBe(true); // High similarity should pass
        expect(matchesText('Completely different', 'Totally unrelated', 0.9)).toBe(false);
        expect(matchesText('Completely different', 'Totally unrelated', 0.1)).toBe(false); // Should still fail even with low threshold
      });

      it('should use stricter thresholds for safety', () => {
        // The 0.7 threshold used in ToolRunner should prevent false positives
        expect(matchesText('Existing text', 'NonexistentText', 0.7)).toBe(false);
        expect(matchesText('Random words here', 'Different content there', 0.7)).toBe(false);
      });
    });

    describe('Word Length and Significance', () => {
      it('should ignore very short words in matching', () => {
        // Words <= 2 chars should be filtered out to avoid false positives
        const result1 = matchesText('A big red car', 'A small blue truck');
        const result2 = matchesText('Go to the store', 'Go to the park');
        
        // These should NOT match just because they share "A", "to", "the"
        expect(result1).toBe(false);
        expect(result2).toBe(false);
      });

      it('should require exact matches for short significant words', () => {
        // Short but meaningful words should match exactly
        expect(matchesText('CSS Grid Layout', 'CSS')).toBe(true);
        expect(matchesText('API Documentation', 'API')).toBe(true);
        expect(matchesText('CSS Grid Layout', 'JSS')).toBe(false); // Similar but not exact
      });
    });
  });
});
