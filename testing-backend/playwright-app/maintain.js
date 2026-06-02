require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const { crawlSite } = require('./services/crawlerService');
const { generateTest, updateTest } = require('./services/aiService');

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
  const sitemapsDir = path.join(__dirname, 'sitemaps');
  const oldSitemapPath = path.join(sitemapsDir, `${hostname}.json`);

  let oldSitemap;
  try {
    oldSitemap = JSON.parse(await fs.readFile(oldSitemapPath, 'utf8'));
  } catch {
    console.error(`No existing sitemap found. Run generate.js first.`);
    process.exit(1);
  }

  const oldPageMap = Object.fromEntries(oldSitemap.pages.map(p => [p.url, p]));

  console.log(`\nRe-crawling: ${url}`);
  const newPages = await crawlSite(url);
  console.log(`Found ${newPages.length} page(s).`);

  const newSitemap = {
    hostname,
    crawled_at: new Date().toISOString(),
    total_pages: newPages.length,
    pages: newPages.map(p => ({
      url: p.url,
      title: p.title,
      snapshot: p.snapshot,
      interactiveElements: p.interactiveElements,
    })),
  };

  const newSitemapPath = path.join(sitemapsDir, `${hostname}_new.json`);
  await fs.writeFile(newSitemapPath, JSON.stringify(newSitemap, null, 2));

  const newPageMap = Object.fromEntries(newPages.map(p => [p.url, p]));
  const testDir = path.join(__dirname, 'tests', 'generated', hostname);
  const archivedDir = path.join(testDir, 'archived');
  await fs.mkdir(archivedDir, { recursive: true });

  const manifestPath = path.join(testDir, 'manifest.json');
  let manifest = {};
  try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch { }

  const oldUrls = new Set(Object.keys(oldPageMap));
  const newUrls = new Set(newPages.map(p => p.url));

  const addedUrls = [...newUrls].filter(u => !oldUrls.has(u));
  const removedUrls = [...oldUrls].filter(u => !newUrls.has(u));
  const commonUrls = [...newUrls].filter(u => oldUrls.has(u));

  console.log(`\nNew: ${addedUrls.length}, Removed: ${removedUrls.length}, Common: ${commonUrls.length}`);

  for (const u of addedUrls) {
    const pageData = newPageMap[u];
    const slug = urlToSlug(u);
    const testFile = path.join(testDir, `${slug}.spec.js`);
    console.log(`  [NEW] Generating test for: ${u}`);
    const testCode = await generateTest(pageData);
    await fs.writeFile(testFile, testCode);
    await new Promise(r => setTimeout(r, 4000));
    manifest[u] = {
      url: u,
      test_file: path.relative(__dirname, testFile),
      generated_at: new Date().toISOString(),
      updated_at: null,
      status: 'pending',
      last_run: null,
      heal_count: 0,
    };
  }

  for (const u of removedUrls) {
    const entry = manifest[u];
    if (entry) {
      const src = path.join(__dirname, entry.test_file);
      const dst = path.join(archivedDir, path.basename(src));
      try { await fs.rename(src, dst); } catch { }
      manifest[u] = { ...entry, status: 'archived' };
      console.log(`  [REMOVED] Archived test for: ${u}`);
    }
  }

  for (const u of commonUrls) {
    const oldPage = oldPageMap[u];
    const newPage = newPageMap[u];
    if (oldPage.snapshot === newPage.snapshot) continue;

    const entry = manifest[u];
    if (!entry) continue;
    const testFile = path.join(__dirname, entry.test_file);
    let oldTestCode = '';
    try { oldTestCode = await fs.readFile(testFile, 'utf8'); } catch { continue; }

    console.log(`  [CHANGED] Updating test for: ${u}`);
    const updatedCode = await updateTest(oldPage.snapshot, newPage.snapshot, oldTestCode);
    await fs.writeFile(testFile, updatedCode);
    await new Promise(r => setTimeout(r, 4000));
    manifest[u] = { ...entry, updated_at: new Date().toISOString(), heal_count: 0 };
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  await fs.copyFile(newSitemapPath, oldSitemapPath);
  await fs.unlink(newSitemapPath);

  console.log(`\nDone. Manifest updated.`);
  return { hostname };
}

if (require.main === module) {
  const rawUrl = process.argv[2];
  if (!rawUrl) { console.error('Usage: node maintain.js <url>'); process.exit(1); }
  run(rawUrl).catch(err => { console.error('Fatal error:', err.message); process.exit(1); });
}

module.exports = { run };
