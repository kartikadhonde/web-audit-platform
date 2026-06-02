/**
 * lighthouseWorker.js
 *
 * Runs Lighthouse against a URL using a dedicated Chrome instance launched via
 * Playwright's chromium binary. Lighthouse requires direct CDP access and cannot
 * share a Playwright browser context, so we launch a separate browser on a fixed
 * remote-debugging port, run the audit, then close it.
 */
const { chromium } = require('playwright');
const lighthouse = require('lighthouse').default;

const DEBUGGING_PORT = 9222;

async function lighthouseWorker(url) {
    let browser;
    try {
        // Launch a fresh Chrome instance with remote debugging enabled.
        // Lighthouse connects to this port via CDP — it cannot use Playwright's
        // internal WS transport directly.
        browser = await chromium.launch({
            headless: true,
            args: [`--remote-debugging-port=${DEBUGGING_PORT}`],
        });

        const result = await lighthouse(url, {
            port: DEBUGGING_PORT,
            output: 'json',
            logLevel: 'error',
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        });

        if (!result || !result.lhr) {
            return { type: 'lighthouse', error: 'No Lighthouse result returned' };
        }

        const { categories, audits } = result.lhr;

        return {
            type: 'lighthouse',
            scores: {
                performance:    Math.round((categories.performance?.score    ?? 0) * 100),
                accessibility:  Math.round((categories.accessibility?.score  ?? 0) * 100),
                bestPractices:  Math.round((categories['best-practices']?.score ?? 0) * 100),
                seo:            Math.round((categories.seo?.score            ?? 0) * 100),
            },
            metrics: {
                firstContentfulPaint:   audits['first-contentful-paint']?.displayValue  ?? 'n/a',
                largestContentfulPaint: audits['largest-contentful-paint']?.displayValue ?? 'n/a',
                totalBlockingTime:      audits['total-blocking-time']?.displayValue      ?? 'n/a',
                cumulativeLayoutShift:  audits['cumulative-layout-shift']?.displayValue  ?? 'n/a',
                speedIndex:             audits['speed-index']?.displayValue              ?? 'n/a',
                interactive:            audits['interactive']?.displayValue              ?? 'n/a',
            },
        };

    } catch (err) {
        return { type: 'lighthouse', error: err.message };
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = lighthouseWorker;
