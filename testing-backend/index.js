const express = require('express')
const { chromium } = require('playwright')

const { runSEO }           = require('./workers/seo')
const { runVisual }        = require('./workers/visual')
const { runPerformance }   = require('./workers/performance')
const { runAccessibility } = require('./workers/accessibility')
const { runSecurity }      = require('./workers/security')
const { runLinks }         = require('./workers/links')
const { aggregate }        = require('./aggregate')

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

app.post('/scan', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'url required' })

  let browser
  try {
    browser = await chromium.launch()
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

    // Run all workers in parallel
    const [seo, visual, performance, accessibility, security, links] =
      await Promise.allSettled([
        runSEO(page),
        runVisual(page),
        runPerformance(url),
        runAccessibility(page),
        runSecurity(url),
        runLinks(page),
      ])

    await browser.close()

    // Extract values — failed workers return undefined (still included)
    const workers = {
      seo:           seo.value           ?? { worker: 'seo',           score: 0, error: seo.reason?.message },
      visual:        visual.value        ?? { worker: 'visual',        score: 0, error: visual.reason?.message },
      performance:   performance.value   ?? { worker: 'performance',   score: 0, error: performance.reason?.message },
      accessibility: accessibility.value ?? { worker: 'accessibility', score: 0, error: accessibility.reason?.message },
      security:      security.value      ?? { worker: 'security',      score: 0, error: security.reason?.message },
      links:         links.value         ?? { worker: 'links',         score: 0, error: links.reason?.message },
    }

    const report = aggregate(workers)
    res.json({ url, ...report })

  } catch (err) {
    if (browser) await browser.close().catch(() => {})
    res.status(500).json({ error: err.message })
  }
})

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.listen(3000, () => console.log('Backend running on port 3000'))
