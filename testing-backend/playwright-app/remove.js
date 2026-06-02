const fs = require('fs/promises');
const path = require('path');

async function run(inputUrl) {
  const hostname = new URL(inputUrl).hostname.replace(/\./g, '_');

  const sitemapSrc = path.join(__dirname, 'sitemaps', `${hostname}.json`);
  const sitemapDst = path.join(__dirname, 'sitemaps', 'archived', `${hostname}.json`);
  const testsSrc = path.join(__dirname, 'tests', 'generated', hostname);
  const testsDst = path.join(__dirname, 'tests', 'generated', 'archived', hostname);

  await fs.mkdir(path.join(__dirname, 'sitemaps', 'archived'), { recursive: true });
  await fs.mkdir(path.join(__dirname, 'tests', 'generated', 'archived'), { recursive: true });

  try {
    await fs.rename(sitemapSrc, sitemapDst);
    console.log(`Sitemap archived: sitemaps/archived/${hostname}.json`);
  } catch {
    console.warn(`No sitemap found for ${hostname}`);
  }

  try {
    await fs.rename(testsSrc, testsDst);
    console.log(`Tests archived: tests/generated/archived/${hostname}/`);
  } catch {
    console.warn(`No test directory found for ${hostname}`);
  }

  console.log(`Done. Removed all data for ${hostname}.`);
}

if (require.main === module) {
  const rawUrl = process.argv[2];
  if (!rawUrl) { console.error('Usage: node remove.js <url>'); process.exit(1); }
  run(rawUrl).catch(err => { console.error('Fatal error:', err.message); process.exit(1); });
}

module.exports = { run };
