const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function visualAnalysisWorker(screenshotPath) {
    try {
        if (!screenshotPath || !fs.existsSync(screenshotPath)) {
            return { type: 'visualAnalysis', error: 'Screenshot not available for visual analysis' };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return { type: 'visualAnalysis', error: 'GEMINI_API_KEY not set' };
        }

        const imageData = fs.readFileSync(screenshotPath);
        const base64Image = imageData.toString('base64');

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are a UI/UX expert reviewing a website screenshot. Analyse it and return a JSON object with these exact keys:
- "layoutScore": number 0-100 (overall layout quality)
- "contrastIssues": array of strings (contrast or readability problems)
- "layoutIssues": array of strings (layout, spacing, alignment problems)
- "uiAnomalies": array of strings (broken elements, overlapping content, odd patterns)
- "positives": array of up to 3 strings (things done well visually)
- "recommendations": array of up to 5 short actionable improvement strings
- "summary": one sentence overall visual assessment

Respond ONLY with the raw JSON object, no markdown, no explanation.`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: base64Image,
                },
            },
        ]);

        const text = result.response.text().trim().replace(/^```json|^```|```$/g, '').trim();
        let analysis;
        try {
            analysis = JSON.parse(text);
        } catch {
            analysis = { summary: text };
        }

        return {
            type: 'visualAnalysis',
            screenshotPath,
            ...analysis,
        };

    } catch (err) {
        return { type: 'visualAnalysis', error: err.message };
    }
}

module.exports = visualAnalysisWorker;
