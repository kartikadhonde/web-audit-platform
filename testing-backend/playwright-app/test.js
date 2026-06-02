require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const { execSync } = require('child_process');

const generate = require('./generate');
const maintain = require('./maintain');
const sync = require('./sync');
const heal = require('./heal');

function getHostname(url) {
  return new URL(url).hostname.replace(/\./g, '_');
}

async function sitemapExists(hostname) {
  try {
    await fs.access(path.join(__dirname, 'sitemaps', `${hostname}.json`));
    return true;
  } catch {
    return false;
  }
}

async function run() {
  const rawUrl = process.argv[2];
  if (!rawUrl) {
    console.error('Usage: node test.js <url>');
    process.exit(1);
  }

  const url = new URL(rawUrl).href;
  const hostname = getHostname(url);
  const testDir = path.join(__dirname, 'tests', 'generated', hostname);
  const manifestPath = path.join(testDir, 'manifest.json');

  const isFirstRun = !(await sitemapExists(hostname));

  if (isFirstRun) {
    console.log('\n[Phase 1] First run — generating tests...');
    await generate.run(url);
  } else {
    console.log('\n[Phase 1] Existing sitemap found — running maintain...');
    await maintain.run(url);
  }

  console.log('\n[Phase 2] Running Playwright tests...');
  const testResultsDir = path.join(__dirname, 'test-results');
  await fs.mkdir(testResultsDir, { recursive: true });

  try {
    execSync(
      `npx playwright test ${testDir}/ --reporter=json`,
      {
        cwd: __dirname,
        stdio: 'inherit',
        env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: 'test-results/results.json' },
      }
    );
  } catch {
    // playwright exits non-zero on failures — that's expected, continue
  }

  console.log('\n[Phase 3] Syncing results to manifest...');
  const manifest = await sync.run(url);

  const failingTests = Object.values(manifest || {}).filter(
    e => e.status === 'failing' && e.heal_count < 3
  );
  const alreadyArchived = Object.values(manifest || {}).filter(e => e.status === 'archived');

  let healResult = { healed: 0, archived: 0 };
  if (failingTests.length > 0) {
    console.log(`\n[Phase 4] Healing ${failingTests.length} failing test(s)...`);
    healResult = await heal.run(url);
  } else {
    console.log('\n[Phase 4] No tests to heal.');
  }

  const finalManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8').catch(() => '{}'));
  const allEntries = Object.values(finalManifest);
  const passing = allEntries.filter(e => e.status === 'passing').length;
  const failing = allEntries.filter(e => e.status === 'failing').length;
  const archived = allEntries.filter(e => e.status === 'archived').length;
  const total = allEntries.length;

  const bar = '='.repeat(40);
  console.log(`\n${bar}`);
  console.log('        TEST RUN SUMMARY');
  console.log(bar);
  console.log(`Total tests:   ${total}`);
  console.log(`Passing:       ${passing}`);
  console.log(`Failing:       ${failing}`);
  console.log(`Archived:      ${archived}`);
  console.log(`Healed:        ${healResult.healed}`);
  if (healResult.archived > 0) {
    console.log(`\nArchived after heal limit (${healResult.archived}):`);
    allEntries
      .filter(e => e.status === 'archived' && !alreadyArchived.find(a => a.test_file === e.test_file))
      .forEach(e => console.log(`  - ${e.test_file}`));
  }
  console.log(bar);
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
