const { chromium } = require('playwright');
const fs = require('fs');

async function run() {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const getBase64 = (path) => {
        try {
            const base64 = fs.readFileSync(path).toString('base64');
            return `data:image/png;base64,${base64}`;
        } catch (e) {
            console.error("Failed to read image:", path);
            return "";
        }
    };

    const img1 = getBase64('/Users/kartikadhonde/.gemini/antigravity-ide/brain/81b39876-1c09-4a7f-83df-457250b19299/Screenshot 2026-05-26 at 10.31.49 AM.png');
    const img2 = getBase64('/Users/kartikadhonde/.gemini/antigravity-ide/brain/81b39876-1c09-4a7f-83df-457250b19299/Screenshot 2026-05-26 at 10.31.59 AM.png');
    const img3 = getBase64('/Users/kartikadhonde/.gemini/antigravity-ide/brain/81b39876-1c09-4a7f-83df-457250b19299/Screenshot 2026-05-26 at 10.32.12 AM.png');
    const img4 = getBase64('/Users/kartikadhonde/.gemini/antigravity-ide/brain/81b39876-1c09-4a7f-83df-457250b19299/Screenshot 2026-05-26 at 10.32.17 AM.png');

    const htmlContent = `
    <html>
    <head>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; line-height: 1.6; color: #333; }
            h1, h2, h3 { color: #111; }
            img { max-width: 100%; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0; }
            .note { background: #f0f8ff; padding: 15px; border-left: 5px solid #007acc; margin: 20px 0; }
            .warning { background: #fff3cd; padding: 15px; border-left: 5px solid #ffc107; margin: 20px 0; }
            .page-break { page-break-before: always; }
        </style>
    </head>
    <body>
        <h1>Google Lighthouse Analysis Overview</h1>
        <p>This document provides a comprehensive look into how <strong>Google Lighthouse</strong> works within our automated website testing suite, what its metrics tell us, and how you can interpret the results using the dashboard.</p>

        <h2>What is Lighthouse?</h2>
        <p>Google Lighthouse is an open-source, automated tool designed to help developers improve the quality of their web pages. It runs a series of audits against a page and generates a report on how well the page performs across multiple key dimensions.</p>

        <h2>How it Works in Our Project</h2>
        <ol>
            <li><strong>Dedicated Worker (<code>workers/lighthouseWorker.js</code>)</strong>: When a test starts, our system spins up a dedicated background worker.</li>
            <li><strong>CDP Connection</strong>: Lighthouse connects directly to a headless Chrome instance using the Chrome DevTools Protocol (CDP).</li>
            <li><strong>Auditing</strong>: It loads the target URL, capturing network traffic, render traces, and computing metrics.</li>
            <li><strong>Data Aggregation</strong>: The raw scores are passed back to our main <code>app.js</code> and fed into the <code>dashboardGenerator.js</code> to create the beautiful HTML interface.</li>
        </ol>

        <div class="page-break"></div>

        <h2>Understanding the Dashboard & Metrics</h2>
        <p>Lighthouse produces four primary scores out of 100. Below is a detailed breakdown of what each score means.</p>

        <h3>Dashboard Overview</h3>
        <img src="${img1}" />
        
        <h3>Lighthouse Section Detail</h3>
        <img src="${img2}" />
        
        <div class="page-break"></div>

        <h3>Metrics Detailed View</h3>
        <img src="${img3}" />

        <h3>Test Report Dashboard</h3>
        <img src="${img4}" />

        <div class="page-break"></div>

        <h3>1. Performance</h3>
        <p>This score reflects how fast your page loads and how quickly users can interact with it. Key sub-metrics include:</p>
        <ul>
            <li><strong>First Contentful Paint (FCP):</strong> The time it takes for the first piece of text or image to appear.</li>
            <li><strong>Largest Contentful Paint (LCP):</strong> The time it takes for the main content to finish rendering.</li>
            <li><strong>Cumulative Layout Shift (CLS):</strong> A measure of visual stability (i.e. elements jumping around as the page loads).</li>
            <li><strong>Time to Interactive (TTI):</strong> When the page becomes fully interactive and responds to clicks/scrolls.</li>
        </ul>
        <div class="note"><strong>Performance Improvements:</strong> Compress images, minify CSS/JS, and implement caching to quickly boost your performance score.</div>

        <h3>2. Accessibility (a11y)</h3>
        <p>This checks if the page is usable by all people, including those with disabilities (e.g., users relying on screen readers or keyboard navigation).</p>
        <ul>
            <li><strong>Checks include:</strong> Proper ARIA roles, color contrast, <code>alt</code> text for images, and logical heading structure.</li>
        </ul>
        <div class="warning"><strong>Accessibility Matters:</strong> Failing accessibility checks can limit your audience and even pose legal risks.</div>

        <h3>3. Best Practices</h3>
        <p>This audits modern web development standards. It checks for:</p>
        <ul>
            <li>Avoiding deprecated APIs.</li>
            <li>Ensuring the site is secure (HTTPS).</li>
            <li>Proper handling of images and scripts.</li>
        </ul>

        <h3>4. SEO (Search Engine Optimization)</h3>
        <p>Ensures the page is optimized for search engine crawlers.</p>
        <div class="note">A high SEO score means Google and other search engines can easily parse your content, improving your site's discoverability.</div>

    </body>
    </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'networkidle' });
    const outputPath = '/Users/kartikadhonde/Documents/application-testing-url-with-ai/Lighthouse_Overview.pdf';
    await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
    await browser.close();
    console.log('PDF generated successfully at ' + outputPath);
}
run();
