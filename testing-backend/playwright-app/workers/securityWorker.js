async function securityWorker(page) {
    try {
        const securityHeaders = [
            'content-security-policy',
            'x-frame-options',
            'strict-transport-security',
            'x-xss-protection',
            'x-content-type-options',
            'referrer-policy',
        ];

        // Use Playwright's API context to fetch headers natively
        // This bypasses browser fetch() limitations that hide security headers
        const res = await page.request.get(page.url());
        const captured = res.headers();

        const present = {};
        const missing = [];

        for (const header of securityHeaders) {
            if (captured[header]) {
                present[header] = captured[header];
            } else {
                missing.push(header);
            }
        }

        return {
            type: 'security',
            presentHeaders: present,
            missingHeaders: missing,
            presentCount: Object.keys(present).length,
            totalChecked: securityHeaders.length,
        };
    } catch (err) {
        return { type: 'security', error: err.message, presentCount: 0, missingHeaders: [], presentHeaders: {} };
    }
}

module.exports = securityWorker;
