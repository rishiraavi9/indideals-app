#!/usr/bin/env tsx
import axios from 'axios';
import * as cheerio from 'cheerio';

const CHANNEL_URL = 'https://t.me/s/iamprasadtech';

(async () => {
  console.log('\n🔍 Debugging Telegram Message Structure\n');

  const response = await axios.get(CHANNEL_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(response.data);

  console.log('📊 Found', $('.tgme_widget_message').length, 'messages\n');

  // Check first 3 messages for structure
  $('.tgme_widget_message').slice(0, 3).each((i, el) => {
    const $msg = $(el);
    console.log(`\n=== Message ${i + 1} ===`);

    // Look for timestamp
    const timestamp = $msg.find('.tgme_widget_message_date time').attr('datetime');
    const messageId = $msg.attr('data-post');
    const text = $msg.find('.tgme_widget_message_text').text().substring(0, 80);

    console.log('  Message ID:', messageId);
    console.log('  Timestamp:', timestamp);
    console.log('  Text:', text + '...');
  });

  console.log('\n');
})();
