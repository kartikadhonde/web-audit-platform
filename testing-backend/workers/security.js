// Worker: Security Headers
// Checks OWASP-recommended response headers

async function runSecurity(url) {
  const res = await fetch(url)
  const headers = Object.fromEntries(res.headers)

  const isHttps = url.startsWith('https://')
  const serverHeader = headers['server'] || ''
  const serverLeaksVersion = /[\d.]{3,}/.test(serverHeader)

  const checks = [
    {
      name: 'HTTPS enforced',
      pass: isHttps,
      value: isHttps ? url : 'URL uses HTTP',
    },
    {
      name: 'Content-Security-Policy header present',
      pass: !!headers['content-security-policy'],
      value: headers['content-security-policy'] || null,
    },
    {
      name: 'X-Frame-Options header present',
      pass: !!headers['x-frame-options'],
      value: headers['x-frame-options'] || null,
    },
    {
      name: 'Strict-Transport-Security (HSTS) present',
      pass: !!headers['strict-transport-security'],
      value: headers['strict-transport-security'] || null,
    },
    {
      name: 'X-Content-Type-Options present',
      pass: !!headers['x-content-type-options'],
      value: headers['x-content-type-options'] || null,
    },
    {
      name: 'Referrer-Policy present',
      pass: !!headers['referrer-policy'],
      value: headers['referrer-policy'] || null,
    },
    {
      name: 'Permissions-Policy present',
      pass: !!headers['permissions-policy'],
      value: headers['permissions-policy'] || null,
    },
    {
      name: 'Server header does not leak version',
      pass: !serverLeaksVersion,
      value: serverHeader || 'not present',
    },
  ]

  const tests = checks.map(c => ({
    name: c.name,
    status: c.pass ? 'PASS' : 'FAIL',
    value: c.value,
  }))

  const passed = tests.filter(t => t.status === 'PASS').length
  const score = Math.round((passed / tests.length) * 100)

  return { worker: 'security', score, tests }
}

module.exports = { runSecurity }
