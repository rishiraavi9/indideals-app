/**
 * Puppeteer configuration for Railway deployment
 * Skip downloading Chromium during npm install - we use system Chromium instead
 */
module.exports = {
  skipDownload: true,
};
