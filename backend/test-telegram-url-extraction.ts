#!/usr/bin/env tsx
import 'dotenv/config';

// Test Telegram message formats
const testMessages = [
  {
    name: 'Ajio with "More" keyword',
    text: '🔥🔥PERFORMAX Men Self-Stripes Regular Fit Crew-Neck Training Sweatshirt🎁 Deal Price : ₹300Buy Here : https://ajiio.co/zavv4PMore : https://ajiio.co/OW3Jb3',
    expectedUrl: 'https://ajiio.co/zavv4P',
    expectedTitle: 'PERFORMAX Men Self-Stripes Regular Fit Crew-Neck Training Sweatshirt',
  },
  {
    name: 'Amazon with space separator',
    text: '🔥🔥Portronics Power Plate 12 Extension Board🎁 ₹361 Buy Here : https://amzn.to/4rZ2MXu',
    expectedUrl: 'https://amzn.to/4rZ2MXu',
    expectedTitle: 'Portronics Power Plate 12 Extension Board',
  },
  {
    name: 'Flipkart with space separator',
    text: '🔥🔥CMF by Nothing 33 W Quick Charge🎁 ₹899 https://fkrt.co/TKfpLW',
    expectedUrl: 'https://fkrt.co/TKfpLW',
    expectedTitle: 'CMF by Nothing 33 W Quick Charge',
  },
];

console.log('\n🧪 Testing Telegram URL Extraction\n');
console.log('='.repeat(70));

for (const test of testMessages) {
  console.log(`\n📝 Test: ${test.name}`);
  console.log(`Message: ${test.text.substring(0, 80)}...`);

  // Test URL extraction
  const urlMatch = test.text.match(/(https?:\/\/[^\s]+?)(?:More|Buy|Click|Deal|Price|Off|\s|$)/i);
  const extractedUrl = urlMatch ? urlMatch[1] : null;

  console.log(`\n  Expected URL: ${test.expectedUrl}`);
  console.log(`  Extracted URL: ${extractedUrl}`);
  console.log(`  ${extractedUrl === test.expectedUrl ? '✅ PASS' : '❌ FAIL'}`);

  // Test title extraction (simulate line-based processing)
  const lines = test.text.split('\n').filter(l => l.trim().length > 0);
  let title = lines[0] || test.text; // First line

  title = title.trim();
  title = title.replace(/^(Deal|Hot Deal|Lightning Deal|Offer|Sale)[\s:]+/i, '');
  title = title.replace(/Buy Here\s*:.*$/i, '');
  title = title.replace(/More\s*:.*$/i, '');
  title = title.replace(/Deal Price\s*:.*$/i, '');
  title = title.replace(/https?:\/\/[^\s]+/g, '');
  title = title.replace(/🎁/g, '');
  title = title.replace(/🔥+/g, '');
  title = title.replace(/🔴+/g, '');
  title = title.replace(/₹\s*[\d,]+/g, ''); // Remove prices
  title = title.replace(/\s+/g, ' ').trim();

  console.log(`\n  Expected Title: ${test.expectedTitle}`);
  console.log(`  Extracted Title: ${title}`);
  console.log(`  ${title === test.expectedTitle ? '✅ PASS' : '❌ FAIL'}`);
}

console.log('\n' + '='.repeat(70));
console.log('✅ All tests completed\n');
