// Worker: SEO Analysis
// Playwright + Cheerio for structural checks
// Claude API for content quality (if ANTHROPIC_API_KEY set)

const cheerio = require('cheerio')

async function runSEO(page) {
  const html = await page.content()
  const $ = cheerio.load(html)

  // Extract raw values
  const title       = $('title').text().trim()
  const metaDesc    = $('meta[name="description"]').attr('content') || null
  const h1Tags      = $('h1').map((_, el) => $(el).text().trim()).get()
  const h2Tags      = $('h2').map((_, el) => $(el).text().trim()).get()
  const canonical   = $('link[rel="canonical"]').attr('href') || null
  const langAttr    = $('html').attr('lang') || null
  const metaTags    = $('meta[name]').map((_, el) => $(el).attr('name')).get()
  const dupeMeta    = metaTags.length !== new Set(metaTags).size

  // 10 PASS/FAIL test assertions
  const tests = [
    {
      name: 'Title tag exists',
      status: title ? 'PASS' : 'FAIL',
      value: title || null,
    },
    {
      name: 'Title length between 10–60 characters',
      status: title.length >= 10 && title.length <= 60 ? 'PASS' : 'FAIL',
      value: `${title.length} chars`,
    },
    {
      name: 'Meta description exists',
      status: metaDesc ? 'PASS' : 'FAIL',
      value: metaDesc || null,
    },
    {
      name: 'Meta description length between 50–160 characters',
      status: metaDesc && metaDesc.length >= 50 && metaDesc.length <= 160 ? 'PASS' : 'FAIL',
      value: metaDesc ? `${metaDesc.length} chars` : 'No meta description',
    },
    {
      name: 'Exactly one H1 tag',
      status: h1Tags.length === 1 ? 'PASS' : 'FAIL',
      value: `${h1Tags.length} H1 tags found`,
    },
    {
      name: 'H1 is not empty',
      status: h1Tags.length > 0 && h1Tags[0].length > 0 ? 'PASS' : 'FAIL',
      value: h1Tags[0] || null,
    },
    {
      name: 'H2 tags exist (content structure)',
      status: h2Tags.length > 0 ? 'PASS' : 'FAIL',
      value: `${h2Tags.length} H2 tags found`,
    },
    {
      name: 'Canonical tag present',
      status: canonical ? 'PASS' : 'FAIL',
      value: canonical || null,
    },
    {
      name: 'No duplicate meta tags',
      status: !dupeMeta ? 'PASS' : 'FAIL',
      value: dupeMeta ? 'Duplicate meta tags found' : 'No duplicates',
    },
    {
      name: 'Lang attribute on <html> tag',
      status: langAttr ? 'PASS' : 'FAIL',
      value: langAttr || null,
    },
  ]

  const passed = tests.filter(t => t.status === 'PASS').length
  const score = Math.round((passed / tests.length) * 100)

  // Claude analysis (optional — only runs if API key is set)
  let claudeAnalysis = null
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      claudeAnalysis = await analyseWithClaude({ title, metaDesc, h1Tags, h2Tags })
    } catch (e) {
      claudeAnalysis = { error: e.message }
    }
  }

  return { worker: 'seo', score, tests, claudeAnalysis }
}

async function analyseWithClaude({ title, metaDesc, h1Tags, h2Tags }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Analyse this webpage's SEO metadata and return JSON only (no markdown):
Title: "${title}"
Meta description: "${metaDesc || 'MISSING'}"
H1: "${h1Tags[0] || 'MISSING'}"
H2s: ${JSON.stringify(h2Tags.slice(0, 5))}

Return: {"score": 0-100, "issues": ["..."], "suggestions": ["..."]}`,
      }],
    }),
  })
  const data = await response.json()
  const text = data.content[0].text.trim()
  return JSON.parse(text)
}

module.exports = { runSEO }
