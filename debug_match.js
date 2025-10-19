// Debug script to understand the false positive
const { matchesText, calculateTextSimilarity } = require('./src/utils/textMatching.ts');

const text1 = 'Existing text';
const text2 = 'NonexistentText';

console.log('=== DEBUGGING FALSE POSITIVE ===');
console.log(`Text 1: "${text1}"`);
console.log(`Text 2: "${text2}"`);

const n1 = text1.toLowerCase().trim();
const n2 = text2.toLowerCase().trim();
console.log(`Normalized 1: "${n1}"`);
console.log(`Normalized 2: "${n2}"`);

// Check exact match
console.log(`Exact match: ${n1 === n2}`);

// Check contains
console.log(`1 contains 2: ${n1.includes(n2)}`);
console.log(`2 contains 1: ${n2.includes(n1)}`);

// Check word matching
const words1 = n1.split(/\s+/).filter(word => word.length > 2);
const words2 = n2.split(/\s+/).filter(word => word.length > 2);
console.log(`Words 1: [${words1.join(', ')}]`);
console.log(`Words 2: [${words2.join(', ')}]`);

// Check word-based matching logic
if (words2.length > 0) {
  const matchedWords = words2.filter(searchWord => 
    words1.some(shapeWord => {
      console.log(`  Checking "${searchWord}" vs "${shapeWord}"`);
      if (searchWord.length <= 3 || shapeWord.length <= 3) {
        const exactMatch = searchWord === shapeWord;
        console.log(`    Short word exact match: ${exactMatch}`);
        return exactMatch;
      }
      const contains1 = shapeWord.includes(searchWord);
      const contains2 = searchWord.includes(shapeWord);
      const similarity = calculateTextSimilarity(shapeWord, searchWord);
      console.log(`    Contains 1->2: ${contains1}, 2->1: ${contains2}, Similarity: ${similarity}`);
      return contains1 || contains2 || similarity >= 0.8;
    })
  );
  
  console.log(`Matched words: [${matchedWords.join(', ')}]`);
  console.log(`Required matches: ${Math.ceil(words2.length * 0.9)}`);
  console.log(`Word-based match: ${matchedWords.length >= Math.ceil(words2.length * 0.9)}`);
}

// Check similarity
const similarity = calculateTextSimilarity(n1, n2);
console.log(`Overall similarity: ${similarity}`);
console.log(`Text 1 length: ${n1.length}, Text 2 length: ${n2.length}`);

const isShort = n1.length <= 10 || n2.length <= 10;
console.log(`Is short text: ${isShort}`);
if (isShort) {
  console.log(`Short text threshold (0.95): ${similarity >= 0.95}`);
} else {
  console.log(`Long text threshold (0.85): ${similarity >= 0.85}`);
}

console.log(`\nFinal result: ${matchesText(text1, text2, 0.7)}`);
