const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function seoWorker(page) {
    try {
        const html = await page.content();
        const $ = cheerio.load(html);

        // Extract SEO signals
        const title = $('title').text().trim();
        const metaDescription = $('meta[name="description"]').attr('content') || '';
        const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
        const canonical = $('link[rel="canonical"]').attr('href') || '';
        const ogTitle = $('meta[property="og:title"]').attr('content') || '';
        const ogDescription = $('meta[property="og:description"]').attr('content') || '';
        const ogImage = $('meta[property="og:image"]').attr('content') || '';
        const twitterCard = $('meta[name="twitter:card"]').attr('content') || '';

        const headings = {};
        ['h1', 'h2', 'h3', 'h4'].forEach(tag => {
            headings[tag] = [];
            $(tag).each((_, el) => {
                const text = $(el).text().trim();
                if (text) headings[tag].push(text);
            });
        });

        const images = { total: 0, missingAlt: 0 };
        $('img').each((_, el) => {
            images.total++;
            if (!$(el).attr('alt')) images.missingAlt++;
        });

        const internalLinks = new Set();
        const externalLinks = new Set();
        const pageOrigin = new URL(page.url()).origin;
        $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            try {
                const resolved = new URL(href, page.url());
                if (resolved.origin === pageOrigin) internalLinks.add(resolved.href);
                else externalLinks.add(resolved.href);
            } catch { /* ignore malformed */ }
        });

        const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 3000);
        const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

        const extracted = {
            title, metaDescription, metaKeywords, canonical,
            ogTitle, ogDescription, ogImage, twitterCard,
            headings, images,
            linkCounts: { internal: internalLinks.size, external: externalLinks.size },
            wordCount,
        };

        // Gemini analysis
        let aiAnalysis = null;
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const prompt = `You are an SEO expert. Analyse the following page data and return a JSON object with these exact keys:
- "contentQuality": string (Good/Fair/Poor)
- "titleIssues": array of strings (problems with the title tag, empty if none)
- "metaIssues": array of strings (problems with meta description, empty if none)
- "headingIssues": array of strings (heading hierarchy problems, empty if none)
- "socialIssues": array of strings (Open Graph / Twitter card problems, empty if none)
- "recommendations": array of up to 5 short actionable strings
- "summary": one sentence overall SEO assessment

Page data:
${JSON.stringify(extracted, null, 2)}

Respond ONLY with the raw JSON object, no markdown, no explanation.`;

            const result = await model.generateContent(prompt);
            const text = result.response.text().trim().replace(/^```json|^```|```$/g, '').trim();
            try {
                aiAnalysis = JSON.parse(text);
            } catch {
                aiAnalysis = { summary: text };
            }
        }

        return {
            type: 'seo',
            extracted,
            aiAnalysis,
        };

    } catch (err) {
        return { type: 'seo', error: err.message };
    }
}

module.exports = seoWorker;
