const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    timeout: 120000,
    reporter: [['html', { open: 'never' }]],
    use: {
        headless: true,
        ignoreHTTPSErrors: true,
    },
    workers: 1,
});
