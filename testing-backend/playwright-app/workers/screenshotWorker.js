const path = require('path');
const fs = require('fs');

async function screenshotWorker(page, url) {
    try {
        const reportsDir = path.join(__dirname, '..', 'reports');
        if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

        const hostname = new URL(url).hostname.replace(/\./g, '_');
        const timestamp = Date.now();
        const filename = `${hostname}_${timestamp}.png`;
        const filepath = path.join(reportsDir, filename);

        await page.screenshot({ path: filepath, fullPage: true });

        return {
            type: 'screenshot',
            path: `reports/${filename}`,
            success: true,
        };
    } catch (err) {
        return { type: 'screenshot', error: err.message, success: false };
    }
}

module.exports = screenshotWorker;
