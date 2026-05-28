// Worker: Broken Links
// Crawls all hrefs on page, HEAD-requests each, checks status codes

async function runLinks(page) {
  const links = await page.$$eval('a[href]', els =>
    els.map(el => el.href).filter(h => h.startsWith('http'))
  )

  const uniqueLinks = [...new Set(links)]
  const toCheck = uniqueLinks.slice(0, 30)

  const results = await Promise.allSettled(
    toCheck.map(async link => {
      try {
        const r = await fetch(link, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
        return {
          link,
          status: r.status,
          broken: r.status >= 400,
          redirectLoop: false,
          isLocalhost: false,
        }
      } catch (e) {
        return { link, status: 0, broken: true, redirectLoop: false, isLocalhost: false }
      }
    })
  )

  const checked = results.map(r => r.value || { link: 'unknown', status: 0, broken: true })

  const broken404     = checked.filter(r => r.status === 404)
  const broken5xx     = checked.filter(r => r.status >= 500 && r.status < 600)
  const localhostLinks = checked.filter(r =>
    r.link.includes('localhost') || r.link.includes('127.0.0.1')
  )

  const tests = [
    {
      name: 'Zero 404 links',
      status: broken404.length === 0 ? 'PASS' : 'FAIL',
      value: broken404.length === 0 ? 'None found' : `${broken404.length} broken: ${broken404.map(l => l.link).join(', ')}`,
    },
    {
      name: 'Zero 5xx server error links',
      status: broken5xx.length === 0 ? 'PASS' : 'FAIL',
      value: broken5xx.length === 0 ? 'None found' : `${broken5xx.length} errors`,
    },
    {
      name: 'No links pointing to localhost',
      status: localhostLinks.length === 0 ? 'PASS' : 'FAIL',
      value: localhostLinks.length === 0 ? 'None found' : `${localhostLinks.length} localhost links`,
    },
    {
      name: 'External links reachable',
      status: checked.every(r => !r.broken) ? 'PASS' : 'FAIL',
      value: `${checked.filter(r => !r.broken).length}/${checked.length} reachable`,
    },
    {
      name: 'Page has at least one link',
      status: uniqueLinks.length > 0 ? 'PASS' : 'FAIL',
      value: `${uniqueLinks.length} links found`,
    },
  ]

  const passed = tests.filter(t => t.status === 'PASS').length
  const score = Math.round((passed / tests.length) * 100)
  const brokenLinks = checked.filter(r => r.broken)

  return { worker: 'links', score, tests, checkedLinks: checked.length, brokenLinks }
}

module.exports = { runLinks }
