const { chromium } = require('playwright');

async function launchBrowser() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (compatible; WebTester/1.0)',
        ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    return { browser, context, page };
}

async function openURL(page, url) {
    await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
    });
}

module.exports = { launchBrowser, openURL };
