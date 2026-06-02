const path = require('path');
const fs = require('fs');
const { launchBrowser, openURL } = require('./services/browserService');
const basicInfoWorker = require('./workers/basicInfoWorker');
const accessibilityWorker = require('./workers/accessibilityWorker');
const screenshotWorker = require('./workers/screenshotWorker');
const brokenLinkWorker = require('./workers/brokenLinkWorker');
const securityWorker = require('./workers/securityWorker');
const performanceWorker = require('./workers/performanceWorker');
const lighthouseWorker = require('./workers/lighthouseWorker');
const seoWorker = require('./workers/seoWorker');
const visualAnalysisWorker = require('./workers/visualAnalysisWorker');
const { calculateScores } = require('./utils/scoreCalculator');
const { saveDashboard } = require('./utils/dashboardGenerator');

function validateURL(input) {
    try {
        const url = new URL(input);
        if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('Only http and https URLs are supported.');
        }
        return url.href;
    } catch {
        throw new Error(`Invalid URL: "${input}". Provide a full URL like https://example.com`);
    }
}

function printReport(report, scores) {
    const bar = '='.repeat(40);
    console.log(`\n${bar}`);
    console.log('       WEBSITE TEST REPORT');
    console.log(`${bar}`);
    console.log(`\nURL:   ${report.url}`);
    console.log(`Title: ${report.title}`);

    console.log(`\n--- Performance --- [Score: ${scores.performanceScore}/100]`);
    if (report.performance && !report.performance.error) {
        const p = report.performance;
        const fmt = v => v !== null && v !== undefined ? `${v} ms` : 'n/a (SPA/lazy)';
        const kb  = v => v ? `${(v / 1024).toFixed(1)} KB` : 'n/a';
        console.log(`Time to First Byte (TTFB):   ${fmt(p.ttfb)}`);
        console.log(`DOM Ready:                   ${fmt(p.domReady)}`);
        console.log(`Load Complete:               ${fmt(p.loadComplete)}`);
        console.log(`Resources Loaded:            ${p.resourceCount ?? 'n/a'}`);
        console.log(`Total Transfer Size:         ${kb(p.transferSize)}`);
    } else {
        console.log('Performance data unavailable.');
    }

    console.log(`\n--- Accessibility --- [Score: ${scores.accessibilityScore}/100]`);
    console.log(`Violations: ${report.accessibility.violationCount ?? 'n/a'}`);
    if (report.accessibility.violations && report.accessibility.violations.length > 0) {
        for (const v of report.accessibility.violations) {
            console.log(`  [${v.impact?.toUpperCase()}] ${v.id}: ${v.description} (${v.nodes} element(s))`);
        }
    }

    console.log(`\n--- Security Headers --- [Score: ${scores.securityScore}/100]`);
    const present = Object.keys(report.security.presentHeaders || {});
    const missing = report.security.missingHeaders || [];
    if (present.length > 0) {
        console.log(`Present (${present.length}): ${present.join(', ')}`);
    }
    if (missing.length > 0) {
        console.log(`Missing (${missing.length}): ${missing.join(', ')}`);
    }

    console.log(`\n--- Broken Links --- [Score: ${scores.brokenLinksScore}/100]`);
    console.log(`Checked: ${report.brokenLinks.totalChecked ?? 0}  |  Broken: ${report.brokenLinks.brokenCount ?? 0}`);
    if (report.brokenLinks.brokenLinks && report.brokenLinks.brokenLinks.length > 0) {
        for (const l of report.brokenLinks.brokenLinks) {
            console.log(`  [${l.status}] ${l.link}`);
        }
    }

    console.log(`\n--- Lighthouse ---`);
    if (report.lighthouse && !report.lighthouse.error) {
        const lh = report.lighthouse;
        console.log(`Performance:    ${lh.scores.performance}/100`);
        console.log(`Accessibility:  ${lh.scores.accessibility}/100`);
        console.log(`Best Practices: ${lh.scores.bestPractices}/100`);
        console.log(`SEO:            ${lh.scores.seo}/100`);
        console.log(`  FCP:  ${lh.metrics.firstContentfulPaint}  |  LCP: ${lh.metrics.largestContentfulPaint}`);
        console.log(`  TBT:  ${lh.metrics.totalBlockingTime}  |  CLS: ${lh.metrics.cumulativeLayoutShift}`);
        console.log(`  Speed Index: ${lh.metrics.speedIndex}  |  TTI: ${lh.metrics.interactive}`);
    } else {
        console.log(`Lighthouse unavailable: ${report.lighthouse?.error ?? 'unknown error'}`);
    }

    console.log(`\n--- Screenshot ---`);
    console.log(report.screenshot.success ? report.screenshot.path : 'Screenshot failed.');

    console.log(`\n${bar}\n`);
}

async function run() {
    const rawURL = process.argv[2];
    if (!rawURL) {
        console.error('Usage: node app.js <url>');
        console.error('Example: node app.js https://github.com');
        process.exit(1);
    }

    let url;
    try {
        url = validateURL(rawURL);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }

    console.log(`\nStarting tests for: ${url}`);
    console.log('Launching browser...');

    let browser;
    try {
        const { browser: b, page } = await launchBrowser();
        browser = b;

        console.log('Opening URL...');
        await openURL(page, url);
        console.log('Page loaded. Running workers...\n');

        const [
            basicInfo,
            accessibility,
            screenshot,
            brokenLinks,
            security,
            performance,
        ] = await Promise.all([
            basicInfoWorker(page),
            accessibilityWorker(page),
            screenshotWorker(page, url),
            brokenLinkWorker(page),
            securityWorker(page),
            performanceWorker(page),
        ]);

        const scores = calculateScores({ accessibility, performance, security, brokenLinks });

        console.log('Running Lighthouse audit (separate Chrome instance)...');
        const lighthouse = await lighthouseWorker(url);

        console.log('Running SEO & content analysis...');
        const seo = await seoWorker(page);

        console.log('Running visual analysis...');
        const visualAnalysis = await visualAnalysisWorker(screenshot.path);

        const report = {
            url: basicInfo.url || url,
            title: basicInfo.title || '',
            generatedAt: new Date().toISOString(),
            scores,
            basicInfo,
            accessibility,
            performance,
            lighthouse,
            seo,
            visualAnalysis,
            security,
            brokenLinks,
            screenshot,
        };

        const reportsDir = path.join(__dirname, 'reports');
        if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

        const reportPath = path.join(reportsDir, 'report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        const dashboardPath = path.join(reportsDir, 'dashboard.html');
        saveDashboard(report, dashboardPath);

        printReport(report, scores);
        console.log(`Full report saved to:  reports/report.json`);
        console.log(`Dashboard saved to:    reports/dashboard.html`);

    } finally {
        if (browser) await browser.close();
    }
}

run().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
