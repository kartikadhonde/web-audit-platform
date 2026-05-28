// Worker: Visual Analysis
// Playwright screenshot + Claude Vision (if ANTHROPIC_API_KEY set)

async function runVisual(page) {
  const screenshotBuffer = await page.screenshot({ fullPage: true })
  const screenshot = screenshotBuffer.toString('base64')

  // Static tests we can do without Claude
  const tests = [
    {
      name: 'Screenshot captured successfully',
      status: screenshot ? 'PASS' : 'FAIL',
      value: screenshot ? `${Math.round(screenshotBuffer.length / 1024)} KB` : null,
    },
  ]

  // Claude Vision analysis (optional — only runs if API key is set)
  let claudeAnalysis = null
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const result = await analyseWithClaudeVision(screenshot)
      claudeAnalysis = result

      // Add Claude-derived tests
      if (result.tests) tests.push(...result.tests)
    } catch (e) {
      claudeAnalysis = { error: e.message }
    }
  }

  const passed = tests.filter(t => t.status === 'PASS').length
  const score = Math.round((passed / tests.length) * 100)

  return { worker: 'visual', score, screenshot, tests, claudeAnalysis }
}

async function analyseWithClaudeVision(base64Image) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: base64Image },
          },
          {
            type: 'text',
            text: `Analyse this webpage screenshot for visual/UI issues. Return JSON only (no markdown):
{"tests": [{"name": "Layout appears intact", "status": "PASS"|"FAIL"}, {"name": "No broken images detected", "status": "PASS"|"FAIL"}, {"name": "Text is readable", "status": "PASS"|"FAIL"}, {"name": "No obvious UI anomalies", "status": "PASS"|"FAIL"}], "issues": ["..."], "suggestions": ["..."]}`,
          },
        ],
      }],
    }),
  })
  const data = await response.json()
  const text = data.content[0].text.trim()
  return JSON.parse(text)
}

module.exports = { runVisual }
