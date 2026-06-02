require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = 'gemini-1.5-flash';

const GENERATE_SYSTEM = `You are a Playwright test writer. Output only valid JavaScript Playwright test code using @playwright/test. No explanation, no markdown fences, no comments. Tests should cover: page loads and title is not empty, all visible interactive elements are present using getByRole() or getByLabel() only, no console errors on load. If forms exist on the page (input fields, textareas, selects, checkboxes, radio buttons), generate form interaction tests: fill text inputs with realistic dummy data, select dropdown options, check checkboxes, and click submit/send buttons. After form submission, verify the page does not crash or show console errors. Rules: never use CSS selectors or XPath, never assert exact page titles only that title is not empty, never generate navigation tests that leave the current page, always use waitFor() before every element assertion, use realistic dummy data for form fills (e.g. "John Doe" for names, "test@example.com" for emails, "1234567890" for phone numbers).`;

const HEAL_SYSTEM = `Fix this failing Playwright test. The error and current page structure are provided. Output only the corrected test code, no explanation, no markdown fences.`;

const UPDATE_SYSTEM = `Update this Playwright test to match the new page structure. Output only the updated test code, no explanation, no markdown fences.`;

async function callGemini(systemInstruction, userContent, retries = 4) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction,
    generationConfig: { maxOutputTokens: 1000 },
  });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(userContent);
      return result.response.text();
    } catch (err) {
      const is429 = err.message?.includes('429') || err.message?.includes('Too Many Requests');
      if (is429 && attempt < retries) {
        const waitMs = Math.pow(2, attempt + 1) * 5000;
        console.log(`  Rate limited. Waiting ${waitMs / 1000}s before retry ${attempt + 1}/${retries}...`);
        await new Promise(r => setTimeout(r, waitMs));
      } else {
        throw err;
      }
    }
  }
}

async function generateTest(pageData) {
  const content = `URL: ${pageData.url}
Title: ${pageData.title}
Snapshot:
${pageData.snapshot}
Interactive elements:
${pageData.interactiveElements.map(e => `- ${e.role}: ${e.label}`).join('\n')}`;

  return callGemini(GENERATE_SYSTEM, content);
}

async function healTest(testCode, errorMessage, freshSnapshot = '') {
  const snapshotSection = freshSnapshot ? `\n\nCurrent page snapshot:\n${freshSnapshot}` : '';
  return callGemini(HEAL_SYSTEM, `Test file:\n${testCode}\n\nError:\n${errorMessage}${snapshotSection}`);
}

async function updateTest(oldSnapshot, newSnapshot, oldTestCode) {
  return callGemini(UPDATE_SYSTEM, `Old snapshot:\n${oldSnapshot}\n\nNew snapshot:\n${newSnapshot}\n\nExisting test:\n${oldTestCode}`);
}

module.exports = { generateTest, healTest, updateTest };
