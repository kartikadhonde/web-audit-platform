const { test, expect } = require('@playwright/test');
const basicInfoWorker = require('../workers/basicInfoWorker');
const accessibilityWorker = require('../workers/accessibilityWorker');
const performanceWorker = require('../workers/performanceWorker');
const securityWorker = require('../workers/securityWorker');
const brokenLinkWorker = require('../workers/brokenLinkWorker');
const screenshotWorker = require('../workers/screenshotWorker');
const lighthouseWorker = require('../workers/lighthouseWorker');

const TARGET_URL = process.env.TEST_URL || 'https://example.com';

test.describe(`Website Audit: ${TARGET_URL}`, () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });

    test('Basic Info — page loads and has a title', async ({ page }) => {
        const result = await basicInfoWorker(page);
        expect(result.error, `Worker error: ${result.error}`).toBeUndefined();
        expect(result.title).toBeTruthy();
        console.log(`Title: ${result.title}`);
        console.log(`URL:   ${result.url}`);
    });

    test('Performance — TTFB under 3s, load under 10s', async ({ page }) => {
        const result = await performanceWorker(page);
        expect(result.error, `Worker error: ${result.error}`).toBeUndefined();

        console.log(`TTFB:          ${result.ttfb ?? 'n/a'} ms`);
        console.log(`DOM Ready:     ${result.domReady ?? 'n/a'} ms`);
        console.log(`Load Complete: ${result.loadComplete ?? 'n/a'} ms`);
        console.log(`Resources:     ${result.resourceCount}`);
        console.log(`Transfer Size: ${result.transferSize ? (result.transferSize / 1024).toFixed(1) + ' KB' : 'n/a'}`);

        if (result.ttfb !== null) {
            expect(result.ttfb, `TTFB too slow: ${result.ttfb}ms`).toBeLessThan(3000);
        }
        if (result.loadComplete !== null) {
            expect(result.loadComplete, `Load too slow: ${result.loadComplete}ms`).toBeLessThan(10000);
        }
    });

    test('Accessibility — no critical violations', async ({ page }) => {
        const result = await accessibilityWorker(page);
        expect(result.error, `Worker error: ${result.error}`).toBeUndefined();

        const criticalViolations = (result.violations || []).filter(v => v.impact === 'critical');

        console.log(`Total violations: ${result.violationCount}`);
        for (const v of result.violations || []) {
            console.log(`  [${v.impact?.toUpperCase()}] ${v.id}: ${v.description} (${v.nodes} element(s))`);
        }

        expect(criticalViolations.length, `Critical accessibility violations found:\n${criticalViolations.map(v => `  - ${v.id}: ${v.description}`).join('\n')}`).toBe(0);
    });

    test('Security Headers — all required headers present', async ({ page }) => {
        const result = await securityWorker(page);
        expect(result.error, `Worker error: ${result.error}`).toBeUndefined();

        console.log(`Present (${result.presentCount}): ${Object.keys(result.presentHeaders || {}).join(', ') || 'none'}`);
        console.log(`Missing (${result.missingHeaders?.length}): ${result.missingHeaders?.join(', ') || 'none'}`);

        expect(result.missingHeaders, `Missing security headers: ${result.missingHeaders?.join(', ')}`).toHaveLength(0);
    });

    test('Broken Links — no broken links found', async ({ page }) => {
        const result = await brokenLinkWorker(page);
        expect(result.error, `Worker error: ${result.error}`).toBeUndefined();

        console.log(`Checked: ${result.totalChecked}  |  Broken: ${result.brokenCount}`);
        for (const l of result.brokenLinks || []) {
            console.log(`  [${l.status}] ${l.link}`);
        }

        expect(result.brokenCount, `Broken links:\n${result.brokenLinks?.map(l => `  [${l.status}] ${l.link}`).join('\n')}`).toBe(0);
    });

    test('Screenshot — captures full page', async ({ page }) => {
        const result = await screenshotWorker(page, TARGET_URL);
        console.log(result.success ? `Saved: ${result.path}` : `Failed: ${result.error}`);
        expect(result.success, `Screenshot failed: ${result.error}`).toBe(true);
    });

    test('Lighthouse — performance score above 50, no major SEO issues', async () => {
        const result = await lighthouseWorker(TARGET_URL);
        expect(result.error, `Lighthouse error: ${result.error}`).toBeUndefined();

        console.log(`Performance:    ${result.scores.performance}/100`);
        console.log(`Accessibility:  ${result.scores.accessibility}/100`);
        console.log(`Best Practices: ${result.scores.bestPractices}/100`);
        console.log(`SEO:            ${result.scores.seo}/100`);
        console.log(`FCP:  ${result.metrics.firstContentfulPaint}  |  LCP: ${result.metrics.largestContentfulPaint}`);
        console.log(`TBT:  ${result.metrics.totalBlockingTime}  |  CLS: ${result.metrics.cumulativeLayoutShift}`);
        console.log(`Speed Index: ${result.metrics.speedIndex}  |  TTI: ${result.metrics.interactive}`);

        expect(result.scores.performance, `Lighthouse performance score too low: ${result.scores.performance}`).toBeGreaterThan(50);
        expect(result.scores.seo, `Lighthouse SEO score too low: ${result.scores.seo}`).toBeGreaterThan(70);
    });
});
