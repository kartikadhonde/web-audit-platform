async function basicInfoWorker(page) {
    try {
        const title = await page.title();
        const url = page.url();
        return {
            type: 'basicInfo',
            title,
            url,
            status: 'loaded',
        };
    } catch (err) {
        return { type: 'basicInfo', error: err.message };
    }
}

module.exports = basicInfoWorker;
