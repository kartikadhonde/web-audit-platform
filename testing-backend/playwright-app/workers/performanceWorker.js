/**
 * performanceWorker.js
 *
 * Collects Web Performance Timing metrics from the Navigation Timing API (Level 2).
 *
 * Metrics returned:
 *  - ttfb          : Time to First Byte — measures server/network latency
 *  - domReady      : DOMContentLoaded — when the DOM is fully parsed (no stylesheets/images)
 *  - loadComplete  : loadEventEnd — full page load including sync resources
 *  - resourceCount : total number of resource requests made
 *  - transferSize  : total bytes transferred across all resources
 *
 * Why polling?
 *  Playwright's page.goto() resolves when the 'load' event fires, but
 *  loadEventEnd (the timestamp marking load event completion) may still be 0
 *  at that exact moment. We poll until it's non-zero (max 5s) before reading.
 *
 * Why multiple metrics instead of one?
 *  A single "load time" is misleading for modern sites that:
 *   - lazy-load content after the initial load event
 *   - run persistent background JS (analytics, websockets)
 *   - are SPAs (React/Angular/Next) that render after JS execution
 *   - keep network requests alive post-load
 *  TTFB, domReady, and loadComplete each measure a different phase and together
 *  give a complete picture of perceived and actual performance.
 */
async function performanceWorker(page) {
    try {
        // Poll until loadEventEnd is non-zero (up to 5 seconds, 100ms intervals).
        // This prevents the "0 ms" bug where we read before the browser finalizes the timestamp.
        await page.waitForFunction(
            () => {
                const nav = performance.getEntriesByType('navigation')[0];
                return nav && nav.loadEventEnd > 0;
            },
            { timeout: 5000 }
        ).catch(() => {
            // If polling times out (SPA or never-ending page), we proceed anyway
            // and rely on whichever metrics are available at that point.
        });

        const metrics = await page.evaluate(() => {
            const nav = performance.getEntriesByType('navigation')[0];
            const resources = performance.getEntriesByType('resource');

            if (!nav) {
                return {
                    ttfb: null,
                    domReady: null,
                    loadComplete: null,
                    resourceCount: resources.length,
                    transferSize: resources.reduce((acc, r) => acc + (r.transferSize || 0), 0),
                };
            }

            return {
                // Server responsiveness: time until first byte of response received
                ttfb: Math.round(nav.responseStart - nav.startTime),

                // DOM parsed: time until DOMContentLoaded fires (no images/stylesheets needed)
                domReady: Math.round(nav.domContentLoadedEventEnd - nav.startTime),

                // Full load: time until load event finishes (sync resources done)
                // Will be null if loadEventEnd is still 0 (SPA / timed-out poll)
                loadComplete: nav.loadEventEnd > 0
                    ? Math.round(nav.loadEventEnd - nav.startTime)
                    : null,

                resourceCount: resources.length,
                transferSize: resources.reduce((acc, r) => acc + (r.transferSize || 0), 0),
            };
        });

        return {
            type: 'performance',
            ...metrics,
        };

    } catch (err) {
        return { type: 'performance', error: err.message };
    }
}

module.exports = performanceWorker;
