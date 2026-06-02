require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const { crawlSinglePage } = require('./services/crawlerService');
const { healTest } = require('./services/aiService');

const HEAL_LIMIT = 3;

function getHostname(url) {
  return new URL(url).hostname.replace(/\./g, '_');
}

function findManifestEntry(manifest, testFilePath) {
  const normalized = testFilePath.replace(/\\/g, '/');
  return Object.entries(manifest).find(([, entry]) => {
    const entryPath = (entry.test_file || '').replace(/\\/g, '/');
    return normalized.endsWith(entryPath) || entryPath.endsWith(path.basename(normalized));
  });
}

async function run(inputUrl) {
  const hostname = getHostname(inputUrl);
  const resultsPath = path.join(__dirname, 'test-results', 'results.json');
  const testDir = path.join(__dirname, 'tests', 'generated', hostname);
  const archivedDir = path.join(testDir, 'archived');
  const manifestPath = path.join(testDir, 'manifest.json');

  let results;
  try {
    results = JSON.parse(await fs.readFile(resultsPath, 'utf8'));
  } catch {
    console.error('Could not read test-results/results.json. Run playwright test first.');
    return { healed: 0, archived: 0 };
  }

  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch {
    console.error(`Could not read manifest for ${hostname}.`);
    return { healed: 0, archived: 0 };
  }

  const failedTests = [];

  function collectFailed(suites) {
    for (const suite of suites) {
      if (suite.suites) collectFailed(suite.suites);
      for (const spec of suite.specs || []) {
        const failed = spec.tests?.some(t => t.results?.some(r => r.status === 'failed' || r.status === 'timedOut'));
        if (!failed) continue;
        const errorResult = spec.tests.flatMap(t => t.results).find(r => r.status === 'failed' || r.status === 'timedOut');
        const error = errorResult?.errors?.map(e => e.message).join('\n') || 'Unknown error';
        failedTests.push({ file: spec.file || suite.file || '', error });
      }
    }
  }

  collectFailed(results.suites || []);

  if (failedTests.length === 0) {
    console.log('No failed tests found.');
    return { healed: 0, archived: 0 };
  }

  await fs.mkdir(archivedDir, { recursive: true });

  let healedCount = 0;
  let archivedCount = 0;

  for (const { file, error } of failedTests) {
    const match = findManifestEntry(manifest, file);
    if (!match) continue;
    const [pageUrl, entry] = match;

    if (entry.heal_count >= HEAL_LIMIT) {
      const src = path.join(__dirname, entry.test_file);
      const dst = path.join(archivedDir, path.basename(src));
      try { await fs.rename(src, dst); } catch { }
      manifest[pageUrl] = { ...entry, status: 'archived' };
      console.log(`Test archived after ${HEAL_LIMIT} failed heal attempts: ${entry.test_file}`);
      archivedCount++;
      continue;
    }

    let testCode;
    try { testCode = await fs.readFile(path.join(__dirname, entry.test_file), 'utf8'); } catch { continue; }

    console.log(`  Healing (attempt ${entry.heal_count + 1}): ${pageUrl}`);
    try {
      const freshPage = await crawlSinglePage(pageUrl);
      const fixed = await healTest(testCode, error, freshPage.snapshot);
      await fs.writeFile(path.join(__dirname, entry.test_file), fixed);
      healedCount++;
    } catch (err) {
      console.warn(`  Failed to heal ${entry.test_file}: ${err.message}`);
    }
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`\nHealed: ${healedCount}, Archived: ${archivedCount}`);
  return { healed: healedCount, archived: archivedCount };
}

if (require.main === module) {
  const rawUrl = process.argv[2];
  if (!rawUrl) { console.error('Usage: node heal.js <url>'); process.exit(1); }
  run(rawUrl).catch(err => { console.error('Fatal error:', err.message); process.exit(1); });
}

module.exports = { run };
