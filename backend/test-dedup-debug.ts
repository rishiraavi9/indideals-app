/**
 * Debug script to understand similarity calculation
 */

// Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }

  return dp[m][n];
}

// Jaccard similarity
function jaccardSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

// Normalize text
function normalizeText(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/🔥|🎁|🔴|⚡/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Extract features
function extractFeatures(title: string): string[] {
  const normalized = normalizeText(title);
  const words = normalized.split(/\s+/);

  const stopWords = new Set([
    'deal', 'price', 'buy', 'here', 'flat', 'off', 'save', 'now',
    'get', 'offer', 'sale', 'discount', 'limited', 'time', 'only',
    'use', 'code', 'coupon', 'order', 'value', 'min', 'max'
  ]);

  return words.filter(word =>
    word.length > 2 && !stopWords.has(word)
  );
}

// Test
const title1 = 'TEST: Sony WH-1000XM5 Wireless Headphones Black';
const title2 = 'TEST: Sony WH-1000XM5 Wireless Headphones Black';

console.log('=== DEBUGGING SIMILARITY CALCULATION ===\n');

console.log('Title 1:', title1);
console.log('Title 2:', title2);
console.log('');

// Normalize
const norm1 = normalizeText(title1);
const norm2 = normalizeText(title2);
console.log('Normalized 1:', norm1);
console.log('Normalized 2:', norm2);
console.log('Are normalized equal?', norm1 === norm2);
console.log('');

// Features
const feat1 = extractFeatures(title1);
const feat2 = extractFeatures(title2);
console.log('Features 1:', feat1);
console.log('Features 2:', feat2);
console.log('');

// Jaccard on features
const jaccardScore = jaccardSimilarity(feat1.join(' '), feat2.join(' '));
console.log('Jaccard similarity:', jaccardScore);

// Levenshtein
const maxLength = Math.max(norm1.length, norm2.length);
const levDistance = levenshteinDistance(norm1, norm2);
const levSimilarity = 1 - (levDistance / maxLength);
console.log('Levenshtein distance:', levDistance);
console.log('Levenshtein similarity:', levSimilarity);
console.log('');

// Price similarity (same price)
const price1 = 25000;
const price2 = 27000;
const priceDiff = Math.abs(price1 - price2);
const avgPrice = (price1 + price2) / 2;
const pricePercentDiff = (priceDiff / avgPrice) * 100;
const priceSimilarity = pricePercentDiff <= 10 ? 1 : (pricePercentDiff <= 20 ? 0.5 : 0);
console.log('Price 1:', price1, 'Price 2:', price2);
console.log('Price % diff:', pricePercentDiff.toFixed(2) + '%');
console.log('Price similarity:', priceSimilarity);
console.log('');

// Final score
const titleWeight = 0.6;
const featureWeight = 0.3;
const priceWeight = 0.1;

const finalScore = (
  (levSimilarity * titleWeight) +
  (jaccardScore * featureWeight) +
  (priceSimilarity * priceWeight)
) * 100;

console.log('=== WEIGHTED CALCULATION ===');
console.log(`Levenshtein (${titleWeight}): ${levSimilarity} * ${titleWeight} = ${levSimilarity * titleWeight}`);
console.log(`Jaccard (${featureWeight}): ${jaccardScore} * ${featureWeight} = ${jaccardScore * featureWeight}`);
console.log(`Price (${priceWeight}): ${priceSimilarity} * ${priceWeight} = ${priceSimilarity * priceWeight}`);
console.log('');
console.log('FINAL SCORE:', Math.round(finalScore) + '%');
console.log('Would be duplicate (>=75)?', finalScore >= 75);
