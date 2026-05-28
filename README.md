# Web Audit Platform (React + Express + n8n)

An automated website auditing platform that runs parallel tests using Playwright, Lighthouse, and axe-core to evaluate websites across 6 dimensions, scores them, and logs the results via an n8n webhook to Google Sheets.

## Architecture Flow
```text
React Frontend (Vite)
      ↓
Vite Proxy (/webhook)
      ↓
n8n Webhook
      ↓
Express Backend (/scan)
      ↓
6 Parallel Workers (Playwright + Tools)
      ↓
Aggregate Scoring (PASS/FAIL)
      ↓
n8n logs row to Google Sheets
      ↓
Respond to Webhook (returns JSON to Frontend)
```

## Setup & Running

### 1. Start the n8n Workflow
- Ensure your n8n workflow is active (listening on the production webhook URL).
- Google Sheets node should be authenticated and mapped to `Sheet2`.

### 2. Start the Backend
```bash
cd testing-backend
npm install
node index.js
```
*Backend runs on `http://localhost:3000`*

### 3. Start the Frontend
```bash
cd testing-backend/frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173` and proxies webhook requests to n8n at `http://localhost:5678`*

## The 6 Audit Dimensions
1. **SEO**: Lighthouse SEO scoring
2. **Performance**: Lighthouse Performance metrics
3. **Accessibility**: axe-core accessibility checks
4. **Security**: HTTP header validation (HSTS, X-Frame-Options, etc.)
5. **Links**: Broken link detection (404s)
6. **Visual**: Screenshot capturing
