const { chromium } = require('playwright');

async function brokenLinkWorker(page) {
    try {
        const baseURL = new URL(page.url()).origin;

        const hrefs = await page.$$eval('a[href]', anchors =>
            anchors.map(a => a.href).filter(Boolean)
        );

        // Deduplicate and limit to avoid excessive requests
        const uniqueLinks = [...new Set(hrefs)].slice(0, 30);

        const results = await Promise.allSettled(
            uniqueLinks.map(async link => {
                // Use a fresh browser context for HEAD requests to avoid interfering with the main page
                const browser = await chromium.launch({ headless: true });
                const context = await browser.newContext({ ignoreHTTPSErrors: true });
                const reqPage = await context.newPage();
                try {
                    const response = await reqPage.goto(link, { timeout: 10000, waitUntil: 'commit' });
                    const status = response ? response.status() : 0;
                    return { link, status, broken: status === 404 || status === 500 || status === 0 };
                } catch {
                    return { link, status: 0, broken: true };
                } finally {
                    await browser.close();
                }
            })
        );

        const checked = results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);

        const broken = checked.filter(r => r.broken);

        return {
            type: 'brokenLinks',
            totalChecked: checked.length,
            brokenCount: broken.length,
            brokenLinks: broken.map(r => ({ link: r.link, status: r.status })),
        };
    } catch (err) {
        return { type: 'brokenLinks', error: err.message, brokenCount: 0, brokenLinks: [] };
    }
}

module.exports = brokenLinkWorker;
