require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const { crawlSite } = require('./services/crawlerService');
const { generateTest } = require('./services/aiService');

function urlToSlug(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

async function run(inputUrl) {
  const url = new URL(inputUrl).href;
  const hostname = new URL(url).hostname.replace(/\./g, '_');

  console.log(`\nCrawling: ${url}`);
  const pages = await crawlSite(url);
  console.log(`Found ${pages.length} page(s).`);

  const sitemap = {
    hostname,
    crawled_at: new Date().toISOString(),
    total_pages: pages.length,
    pages: pages.map(p => ({
      url: p.url,
      title: p.title,
      snapshot: p.snapshot,
      interactiveElements: p.interactiveElements,
    })),
  };

  const sitemapsDir = path.join(__dirname, 'sitemaps');
  await fs.mkdir(sitemapsDir, { recursive: true });
  await fs.writeFile(path.join(sitemapsDir, `${hostname}.json`), JSON.stringify(sitemap, null, 2));
  console.log(`Sitemap saved: sitemaps/${hostname}.json`);

  const testDir = path.join(__dirname, 'tests', 'generated', hostname);
  await fs.mkdir(path.join(testDir, 'archived'), { recursive: true });

  const manifest = {};

  for (const pageData of pages) {
    const slug = urlToSlug(pageData.url);
    const testFile = path.join(testDir, `${slug}.spec.js`);
    const relTestFile = path.relative(__dirname, testFile);

    console.log(`  Generating test for: ${pageData.url}`);
    const testCode = await generateTest(pageData);
    await fs.writeFile(testFile, testCode);
    await new Promise(r => setTimeout(r, 4000));

    manifest[pageData.url] = {
      url: pageData.url,
      test_file: relTestFile,
      generated_at: new Date().toISOString(),
      updated_at: null,
      status: 'pending',
      last_run: null,
      heal_count: 0,
    };
  }

  await fs.writeFile(path.join(testDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nDone. ${pages.length} test(s) generated in tests/generated/${hostname}/`);

  return { hostname, pages: pages.length };
}

if (require.main === module) {
  const rawUrl = process.argv[2];
  if (!rawUrl) { console.error('Usage: node generate.js <url>'); process.exit(1); }
  run(rawUrl).catch(err => { console.error('Fatal error:', err.message); process.exit(1); });
}

module.exports = { run };
