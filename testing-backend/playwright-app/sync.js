const fs = require('fs/promises');
const path = require('path');

function getHostname(url) {
  return new URL(url).hostname.replace(/\./g, '_');
}

function findTestEntry(manifest, testFilePath) {
  const normalized = testFilePath.replace(/\\/g, '/');
  return Object.values(manifest).find(entry => {
    const entryPath = (entry.test_file || '').replace(/\\/g, '/');
    return normalized.endsWith(entryPath) || entryPath.endsWith(path.basename(normalized));
  });
}

async function run(inputUrl) {
  const hostname = getHostname(inputUrl);
  const resultsPath = path.join(__dirname, 'test-results', 'results.json');
  const manifestPath = path.join(__dirname, 'tests', 'generated', hostname, 'manifest.json');

  let results;
  try {
    results = JSON.parse(await fs.readFile(resultsPath, 'utf8'));
  } catch {
    console.error('Could not read test-results/results.json.');
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch {
    console.error(`Could not read manifest for ${hostname}.`);
    return;
  }

  function processSuites(suites) {
    for (const suite of suites) {
      if (suite.suites) processSuites(suite.suites);
      for (const spec of suite.specs || []) {
        const entry = findTestEntry(manifest, spec.file || suite.file || '');
        if (!entry) continue;

        const failed = spec.tests?.some(t => t.results?.some(r => r.status === 'failed' || r.status === 'timedOut'));
        entry.last_run = new Date().toISOString();
        if (failed) {
          entry.status = 'failing';
          entry.heal_count = (entry.heal_count || 0) + 1;
        } else {
          entry.status = 'passing';
          entry.heal_count = 0;
        }
      }
    }
  }

  processSuites(results.suites || []);

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest synced for ${hostname}.`);

  return manifest;
}

if (require.main === module) {
  const rawUrl = process.argv[2];
  if (!rawUrl) { console.error('Usage: node sync.js <url>'); process.exit(1); }
  run(rawUrl).catch(err => { console.error('Fatal error:', err.message); process.exit(1); });
}

module.exports = { run };
