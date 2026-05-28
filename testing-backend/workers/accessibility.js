// Worker: Accessibility (axe-core)
// Injects axe into live DOM via Playwright, runs WCAG checks

const axe = require('axe-core')

async function runAccessibility(page) {
  // Inject axe-core into the live page context
  await page.addScriptTag({ content: axe.source })

  // Run axe and pull back structured violation data
  const { violations } = await page.evaluate(async () => {
    const r = await window.axe.run()
    return {
      violations: r.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        helpUrl: v.helpUrl,
        nodes: v.nodes.length,
      })),
    }
  })

  const critical = violations.filter(v => v.impact === 'critical')
  const serious  = violations.filter(v => v.impact === 'serious')
  const moderate = violations.filter(v => v.impact === 'moderate')
  const minor    = violations.filter(v => v.impact === 'minor')

  // Check for specific violation types
  const hasAltTextIssue     = violations.some(v => v.id === 'image-alt')
  const hasLabelIssue       = violations.some(v => v.id === 'label')
  const hasLandmarkIssue    = violations.some(v => ['landmark-one-main', 'region'].includes(v.id))
  const hasContrastIssue    = violations.some(v => v.id === 'color-contrast')

  const tests = [
    {
      name: 'Zero critical violations',
      status: critical.length === 0 ? 'PASS' : 'FAIL',
      value: critical.length === 0 ? 'None' : `${critical.length} critical issue(s)`,
    },
    {
      name: 'Zero serious violations',
      status: serious.length === 0 ? 'PASS' : 'FAIL',
      value: serious.length === 0 ? 'None' : `${serious.length} serious issue(s)`,
    },
    {
      name: 'All images have alt text',
      status: !hasAltTextIssue ? 'PASS' : 'FAIL',
      value: !hasAltTextIssue ? 'All images have alt' : 'Images missing alt text',
    },
    {
      name: 'All form inputs have labels',
      status: !hasLabelIssue ? 'PASS' : 'FAIL',
      value: !hasLabelIssue ? 'All inputs labelled' : 'Inputs missing labels',
    },
    {
      name: 'Page has landmark regions',
      status: !hasLandmarkIssue ? 'PASS' : 'FAIL',
      value: !hasLandmarkIssue ? 'Landmarks present' : 'Missing landmark regions',
    },
    {
      name: 'Color contrast meets WCAG AA',
      status: !hasContrastIssue ? 'PASS' : 'FAIL',
      value: !hasContrastIssue ? 'Contrast OK' : 'Contrast violations found',
    },
  ]

  const passed = tests.filter(t => t.status === 'PASS').length
  const score = Math.round((passed / tests.length) * 100)

  return {
    worker: 'accessibility',
    score,
    tests,
    violations,
    summary: {
      critical: critical.length,
      serious: serious.length,
      moderate: moderate.length,
      minor: minor.length,
    },
  }
}

module.exports = { runAccessibility }
