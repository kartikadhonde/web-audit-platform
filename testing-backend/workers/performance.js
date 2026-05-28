// Worker: Performance (Lighthouse)
// Runs Lighthouse via chrome-launcher, asserts against Core Web Vitals thresholds

const { default: lighthouse } = require('lighthouse')
const chromeLauncher = require('chrome-launcher')

async function runPerformance(url) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
  })

  try {
    const { lhr } = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'seo', 'best-practices'],
    })

    const perf        = Math.round(lhr.categories.performance.score * 100)
    const lcp         = lhr.audits['largest-contentful-paint']?.numericValue || null  // ms
    const cls         = lhr.audits['cumulative-layout-shift']?.numericValue || null
    const tbt         = lhr.audits['total-blocking-time']?.numericValue || null       // proxy for FID
    const tti         = lhr.audits['interactive']?.numericValue || null               // ms
    const totalBytes  = lhr.audits['total-byte-weight']?.numericValue || null         // bytes
    const renderBlock = lhr.audits['render-blocking-resources']?.details?.items?.length || 0

    const tests = [
      {
        name: 'Performance score > 80',
        status: perf > 80 ? 'PASS' : 'FAIL',
        value: perf,
      },
      {
        name: 'LCP (Largest Contentful Paint) < 2.5s',
        status: lcp !== null && lcp < 2500 ? 'PASS' : 'FAIL',
        value: lcp !== null ? `${(lcp / 1000).toFixed(2)}s` : 'N/A',
      },
      {
        name: 'CLS (Cumulative Layout Shift) < 0.1',
        status: cls !== null && cls < 0.1 ? 'PASS' : 'FAIL',
        value: cls !== null ? cls.toFixed(3) : 'N/A',
      },
      {
        name: 'TBT (Total Blocking Time) < 300ms',
        status: tbt !== null && tbt < 300 ? 'PASS' : 'FAIL',
        value: tbt !== null ? `${Math.round(tbt)}ms` : 'N/A',
      },
      {
        name: 'TTI (Time to Interactive) < 5s',
        status: tti !== null && tti < 5000 ? 'PASS' : 'FAIL',
        value: tti !== null ? `${(tti / 1000).toFixed(2)}s` : 'N/A',
      },
      {
        name: 'Total page size < 5MB',
        status: totalBytes !== null && totalBytes < 5 * 1024 * 1024 ? 'PASS' : 'FAIL',
        value: totalBytes !== null ? `${(totalBytes / 1024).toFixed(0)} KB` : 'N/A',
      },
      {
        name: 'No render-blocking resources',
        status: renderBlock === 0 ? 'PASS' : 'FAIL',
        value: renderBlock === 0 ? 'None found' : `${renderBlock} resource(s)`,
      },
    ]

    const passed = tests.filter(t => t.status === 'PASS').length
    const score = Math.round((passed / tests.length) * 100)

    return {
      worker: 'performance',
      score,
      tests,
      rawScores: {
        performance: perf,
        accessibility: Math.round(lhr.categories.accessibility.score * 100),
        seo: Math.round(lhr.categories.seo.score * 100),
        bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
      },
    }
  } finally {
    await chrome.kill()
  }
}

module.exports = { runPerformance }
