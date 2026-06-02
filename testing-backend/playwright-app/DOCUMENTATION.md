# Website Testing Tool — Project Documentation

**Project:** `url-website-tester`
**Runtime:** Node.js
**Entry Point:** `app.js`
**Version:** 1.0.0
**Date:** May 2026

---

## 1. Overview

This is a terminal-based website auditing tool built on top of [Playwright](https://playwright.dev/). Given any publicly accessible URL, it spins up a headless Chromium browser, loads the page, and runs a battery of parallel automated tests across five domains:

| Domain | What it Tests |
|---|---|
| **Performance** | Page load timing across 3 phases |
| **Accessibility** | WCAG violations via axe-core |
| **Security** | Presence of HTTP security response headers |
| **Broken Links** | HTTP status of all anchor links on the page |
| **Screenshot** | Full-page visual capture |

Results are printed to the terminal and saved as a structured JSON report in the `reports/` directory.

---

## 2. How to Run

```bash
node app.js <url>
```

**Example:**
```bash
node app.js https://www.example.com
```

> The URL must include the protocol (`http://` or `https://`). The tool will error and exit if an invalid or non-HTTP URL is provided.

---

## 3. Project Structure

```
application-testing-playwright/
├── app.js                        # Entry point — orchestrates all workers
├── package.json
├── services/
│   └── browserService.js         # Browser launch and page navigation
├── workers/
│   ├── basicInfoWorker.js        # Page title and URL
│   ├── performanceWorker.js      # Timing metrics (TTFB, DOM Ready, Load Complete)
│   ├── accessibilityWorker.js    # WCAG violation analysis
│   ├── securityWorker.js         # HTTP security header check
│   ├── brokenLinkWorker.js       # Link reachability check
│   └── screenshotWorker.js       # Full-page screenshot capture
├── utils/
│   └── scoreCalculator.js        # Converts raw metrics into 0–100 scores
└── reports/
    ├── report.json               # Latest run output (overwritten each run)
    └── *.png                     # Screenshots (timestamped, never overwritten)
```

---

## 4. Dependencies

| Package | Version | Purpose |
|---|---|---|
| `playwright` | ^1.44.0 | Headless browser automation (Chromium) |
| `@axe-core/playwright` | ^4.9.0 | Accessibility testing engine (WCAG 2.x) |

Install with:
```bash
npm install
npx playwright install chromium
```

---

## 5. Module Reference

### 5.1 `services/browserService.js`

Responsible for launching the headless browser and navigating to the target URL. Used only by `app.js`.

#### `launchBrowser()`
- Launches a headless Chromium instance
- Sets a custom `userAgent` to identify the tool: `Mozilla/5.0 (compatible; WebTester/1.0)`
- Ignores HTTPS certificate errors (`ignoreHTTPSErrors: true`) so HTTPS sites with self-signed or expired certs can still be tested
- Returns the `browser`, `context`, and `page` objects

#### `openURL(page, url)`
- Navigates the page to the given URL
- Waits until `domcontentloaded` (not `load`) before resolving — this is intentionally faster so workers can begin processing while remaining resources still load
- Timeout: **30 seconds**

---

### 5.2 `workers/basicInfoWorker.js`

Collects basic metadata about the loaded page.

#### `basicInfoWorker(page)`
- Reads the page `<title>` tag via `page.title()`
- Reads the final resolved URL via `page.url()` (reflects any redirects)
- Returns `status: 'loaded'` on success

---

### 5.3 `workers/performanceWorker.js`

Collects Web Performance Timing metrics using the browser-native **Navigation Timing API (Level 2)**.

#### Why polling before reading metrics?
Playwright's `page.goto()` resolves when the `load` event fires, but the browser finalizes `loadEventEnd` (the timestamp that marks the load event as complete) slightly *after* that promise resolves. Without polling, `loadEventEnd` reads as `0`, making `loadComplete` always appear as `0 ms`.

The worker polls `loadEventEnd > 0` for up to **5 seconds** before reading. If the poll times out (common for SPAs, lazy-loading pages, or pages with persistent background JS), it silently continues and returns `null` for `loadComplete`.

#### `performanceWorker(page)` — Metrics returned

| Field | Formula | What it Measures |
|---|---|---|
| `ttfb` | `responseStart − startTime` | Server + network latency to first byte of response |
| `domReady` | `domContentLoadedEventEnd − startTime` | Time until DOM is fully parsed (no images/stylesheets needed) |
| `loadComplete` | `loadEventEnd − startTime` | Full page load including synchronous resources; `null` for SPAs |
| `resourceCount` | `performance.getEntriesByType('resource').length` | Total number of sub-resource requests (JS, CSS, images, fonts) |
| `transferSize` | Sum of `r.transferSize` across all resources | Total bytes transferred (compressed) |

> **Note:** `loadComplete` can be `null` on sites that use SPAs (React, Angular, Next.js), lazy-load content, or keep network requests alive indefinitely. The scoring system handles `null` gracefully by redistributing weight to the other two metrics.

---

### 5.4 `workers/accessibilityWorker.js`

Runs a full WCAG 2.x audit using [`axe-core`](https://github.com/dequelabs/axe-core) via the `@axe-core/playwright` integration.

#### `accessibilityWorker(page)`
- Runs `AxeBuilder.analyze()` against the current page DOM
- Returns every violation with: `id`, `impact`, `description`, `nodes` (element count)

**Impact levels** (as classified by axe-core):

| Impact | Severity |
|---|---|
| `critical` | Must fix — likely causes complete barrier for assistive technology users |
| `serious` | Should fix — significant barrier |
| `moderate` | Should fix — partial barrier |
| `minor` | Consider fixing — small inconvenience |

---

### 5.5 `workers/securityWorker.js`

Checks which security-related HTTP response headers are present or missing.

#### `securityWorker(page)`
**Method:** Issues a `fetch()` HEAD request from within the page's browser context to retrieve response headers. This works around the limitation that Playwright does not expose response headers for the initial navigation after the fact.

**Headers checked (6 total):**

| Header | Purpose |
|---|---|
| `content-security-policy` | Prevents XSS and injection attacks |
| `x-frame-options` | Prevents clickjacking via iframes |
| `strict-transport-security` | Forces HTTPS connections (HSTS) |
| `x-xss-protection` | Legacy XSS filter for older browsers |
| `x-content-type-options` | Prevents MIME-type sniffing |
| `referrer-policy` | Controls how much referrer info is sent |

---

### 5.6 `workers/brokenLinkWorker.js`

Crawls all anchor links on the page and checks whether each one is reachable.

#### `brokenLinkWorker(page)`
**Process:**
1. Extracts all `<a href>` values from the page DOM
2. Deduplicates and caps at **30 links** to avoid excessive network load
3. For each link, spawns a **fresh Chromium browser instance** to perform a `goto()` with `waitUntil: 'commit'`
4. All 30 checks run in **parallel** via `Promise.allSettled()`

**A link is marked broken if:**
- HTTP status is `404` (Not Found)
- HTTP status is `500` (Server Error)
- Status is `0` (no response / network error / timeout)

> Each link check uses its own isolated browser instance to avoid request state interfering with the main test page. The 30-link cap keeps runtime manageable.

---

### 5.7 `workers/screenshotWorker.js`

Captures a full-page screenshot of the loaded page.

#### `screenshotWorker(page, url)`
- Saves to `reports/<hostname>_<timestamp>.png`
- Uses `fullPage: true` to capture the entire scrollable page, not just the viewport
- Filenames are unique per run (timestamp-based) so screenshots are never overwritten
- `report.json` is overwritten on every run

---

### 5.8 `utils/scoreCalculator.js`

Converts raw metrics from all workers into normalized 0–100 scores for each domain.

#### `calculateScores({ accessibility, performance, security, brokenLinks })`

##### Accessibility Score
Starts at 100, deducted per violation by impact:

| Impact | Penalty per violation |
|---|---|
| `critical` | −15 |
| `serious` | −10 |
| `moderate` | −5 |
| `minor` | −2 |
| unknown | −3 |

Minimum: **0**

##### Performance Score
Weighted composite of three timing metrics:

| Metric | Weight | Thresholds (ms → score) |
|---|---|---|
| TTFB | 25% | ≤200→100, ≤500→90, ≤1000→75, ≤2000→55, >2000→30 |
| DOM Ready | 35% | ≤1000→100, ≤2500→88, ≤4000→72, ≤6000→55, >6000→35 |
| Load Complete | 40% | ≤1500→100, ≤3000→88, ≤5000→72, ≤8000→55, >8000→35 |

If any metric is `null` (SPA/timeout), its weight is **redistributed proportionally** to the available metrics. This ensures the score is always meaningful.

##### Security Score
```
securityScore = max(0, 100 − (missing headers × 15))
```
Each missing header costs 15 points. A site with all 6 missing scores 10/100.

##### Broken Links Score
```
brokenLinksScore = max(0, 100 − (brokenCount × 10))
```
Each broken link costs 10 points.

---

### 5.9 `app.js`

The main orchestrator. Handles argument parsing, browser lifecycle, parallel worker execution, report printing, and JSON output.

#### `validateURL(input)`
- Validates the input is a proper URL with `http:` or `https:` protocol
- Throws a descriptive error for invalid inputs

#### `printReport(report, scores)`
Prints the formatted terminal report. Each section header includes its score inline:
```
--- Performance --- [Score: 88/100]
--- Accessibility --- [Score: 95/100]
--- Security Headers --- [Score: 25/100]
--- Broken Links --- [Score: 100/100]
```

#### `run()`
Main async execution flow:
1. Validates URL from `process.argv[2]`
2. Calls `launchBrowser()` and `openURL()`
3. Runs **all 6 workers in parallel** via `Promise.all()`
4. Calls `calculateScores()` to compute domain scores
5. Assembles the full `report` object
6. Writes `reports/report.json`
7. Calls `printReport()` to display results
8. Always closes the browser in a `finally` block (no resource leaks)

---

## 6. Output

### 6.1 Terminal Output

```
========================================
       WEBSITE TEST REPORT
========================================

URL:   https://example.com
Title: Example Page Title

--- Performance --- [Score: 88/100]
Time to First Byte (TTFB):   149 ms
DOM Ready:                   361 ms
Load Complete:               1147 ms
Resources Loaded:            9
Total Transfer Size:         993.6 KB

--- Accessibility --- [Score: 95/100]
Violations: 1
  [MODERATE] region: Ensure all page content is contained by landmarks (1 element(s))

--- Security Headers --- [Score: 10/100]
Missing (6): content-security-policy, x-frame-options, ...

--- Broken Links --- [Score: 100/100]
Checked: 5  |  Broken: 0

--- Screenshot ---
reports/example_com_1779437075281.png

========================================
```

### 6.2 JSON Report (`reports/report.json`)

The JSON report contains the full raw data from every worker plus computed scores. It is overwritten on each run. Key fields:

```json
{
  "url": "...",
  "title": "...",
  "generatedAt": "ISO timestamp",
  "scores": {
    "accessibilityScore": 95,
    "performanceScore": 88,
    "securityScore": 10,
    "brokenLinksScore": 100
  },
  "performance": {
    "ttfb": 149,
    "domReady": 361,
    "loadComplete": 1147,
    "resourceCount": 9,
    "transferSize": 1017439
  },
  "accessibility": { "violationCount": 1, "violations": [ ... ] },
  "security": {
    "presentHeaders": { "referrer-policy": "..." },
    "missingHeaders": [ "content-security-policy", ... ],
    "presentCount": 1,
    "totalChecked": 6
  },
  "brokenLinks": {
    "totalChecked": 5,
    "brokenCount": 0,
    "brokenLinks": []
  },
  "screenshot": {
    "path": "reports/example_com_1779437075281.png",
    "success": true
  }
}
```

---

## 7. Observations from Real Test Runs

### 7.1 ccomdigital.in — Content-heavy WordPress site

| Metric | Value |
|---|---|
| TTFB | ~2,757 ms |
| DOM Ready | ~5,527 ms |
| Load Complete | ~13,289 ms |
| Resources Loaded | 170 |
| Transfer Size | ~5.1 MB |
| Performance Score | 34/100 |
| Accessibility Score | 10/100 (9 violations, 3 critical) |
| Security Score | 25/100 (1/6 headers present) |
| Broken Links Score | 80/100 (2 broken) |

**Key observations:**
- Very slow TTFB (~2.7s) suggests no CDN or a slow origin server
- 170 resources and 5.1 MB transfer indicates heavy, unoptimized assets
- Critical accessibility violations: missing `alt` attributes on images, buttons without discernible text, improper ARIA roles
- Only `referrer-policy` header present — missing CSP, HSTS, X-Frame-Options
- Two broken links: a PDF and a blog URL, both returning no response (status 0)

---

### 7.2 fcs.film — Lightweight cinematic portfolio site

| Metric | Value |
|---|---|
| TTFB | ~149 ms |
| DOM Ready | ~361 ms |
| Load Complete | ~1,147 ms |
| Resources Loaded | 9 |
| Transfer Size | ~993 KB |
| Performance Score | 100/100 |
| Accessibility Score | 95/100 (1 violation) |
| Security Score | 10/100 (0/6 headers present) |
| Broken Links Score | 100/100 |

**Key observations:**
- Excellent performance — sub-150ms TTFB, full load under 1.2s, only 9 resources
- Single accessibility issue: page content not wrapped in ARIA landmark regions
- Security is the weak point — no security headers at all (not even `referrer-policy`)
- All links valid

---

## 8. Known Limitations

| Limitation | Detail |
|---|---|
| **SPA support** | For React/Angular/Next.js apps, `loadComplete` may be `null` because rendering happens post-load. TTFB and DOM Ready are still captured. |
| **Authenticated pages** | Pages behind login are not supported — the browser has no session cookies |
| **Link cap at 30** | Only the first 30 unique links are checked to limit runtime and memory usage |
| **Security header method** | Headers are fetched via an in-browser `fetch()` HEAD request. CORS-restricted headers may not appear if the server blocks them for cross-origin fetches |
| **No retry logic** | If a worker throws, it returns an error object and is skipped in scoring. No retries. |
| **report.json overwritten** | Historical data is not preserved across runs. Only screenshots are retained (timestamped). |
| **JS-dependent content** | Workers run after `domcontentloaded`. Content that only appears after additional JS execution may not be fully evaluated. |

---

## 9. Potential Improvements

- **Retry logic** for broken link checks (some links fail transiently)
- **Lighthouse integration** for standardized Web Vitals (LCP, FID, CLS)
- **Multiple URL batch mode** — run against a list of URLs and compare results
- **Historical report storage** — append results to a log instead of overwriting `report.json`
- **HTML report output** — generate a visual report alongside the JSON
- **Authenticated session support** — accept cookies or Playwright storage state as input
- **SPA detection** — detect JS-framework pages and adjust metric expectations accordingly

---

## 10. AI-Driven Test Automation Module

In addition to the core auditor, this project features an autonomous UI testing module powered by Google's Gemini AI (`gemini-2.0-flash`). It automatically generates, executes, heals, and maintains Playwright test suites for any given URL.

### 10.1 Environment Variables
To use this module, you must provide your Gemini API key in a `.env` file at the root of the project:
\`\`\`env
GEMINI_API_KEY=your_gemini_api_key_here
\`\`\`

### 10.2 Entry Points

#### \`generate.js\`
Usage: \`node generate.js <url>\`
Crawls the website to generate a sitemap and passes the "Aria Snapshot" of each page to Gemini AI. The AI writes end-to-end tests for every page, saving them in \`tests/generated/<hostname>/\`. A \`manifest.json\` tracks the state of all generated tests.

#### \`maintain.js\`
Usage: \`node maintain.js <url>\`
Run this after making changes to your website. It re-crawls the site and compares the new sitemap to the old one. It will automatically generate tests for new pages, archive tests for deleted pages, and ask Gemini to update tests for pages whose UI has changed.

#### \`heal.js\`
Usage: \`node heal.js <url>\`
Run this after executing tests via \`npx playwright test --reporter=json\`. It reads the \`test-results/results.json\` file, re-crawls any pages where tests failed to get a fresh UI snapshot, and sends the broken test + error log to Gemini to automatically fix the test code. Tests that fail to heal after 3 attempts are archived.

### 10.3 AI Services

- **\`services/crawlerService.js\`**: Extracts an Aria Snapshot (buttons, forms, links) and normalized text from the DOM. It runs without AI intervention to create a structured blueprint of the page.
- **\`services/aiService.js\`**: Houses the exact prompt engineering and API integration for Gemini to generate strict, selector-free Playwright test code.

### 10.4 Black-Box Philosophy
The AI module operates entirely by looking at the browser's rendered DOM output (the Aria Snapshot). It never accesses or requires the underlying source code of your website. If a code change does not affect the user interface, the tool safely ignores it.
